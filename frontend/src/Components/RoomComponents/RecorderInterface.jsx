import { useEffect,useRef } from "react";

export default function RecorderInterface({
    audio,BPM,mouseDragEnd,zoomFactor,delayCompensation,
    measureTickRef,setIsDragging,mouseDragStart,audioCtxRef,
    waveformRef,playheadRef,isDragging,setMouseDragStart,
    setMouseDragEnd,socket,roomID
}){

    const canvasContainerRef = useRef(null);
    

    useEffect(()=>{
        if(canvasContainerRef.current){
            const canvas = canvasContainerRef.current;
            const canvasContainerCtx = canvasContainerRef.current.getContext("2d");
            const WIDTH = canvas.width;
            const HEIGHT = canvas.height;
            canvasContainerCtx.clearRect(0,0,WIDTH,HEIGHT);
            canvasContainerCtx.fillStyle = "rgb(200,200,200)"
            canvasContainerCtx.fillRect(0,0,WIDTH,HEIGHT);
            const drawBeats = () => {
                canvasContainerCtx.lineWidth = 1;
                canvasContainerCtx.strokeStyle = "rgb(250,250,250)";
                canvasContainerCtx.beginPath();
                canvasContainerCtx.globalAlpha = 1
                //const sliceWidth = (WIDTH * 1.0) / 128.0;
                //const samplesPerBeat = Math.floor(48000/(BPM/60))
                const sliceWidth =  WIDTH / 128;  // Space between each of the 128 lines
    
                for(let i = 0; i <= 128; i++) {
                    const x = Math.round(i * sliceWidth);   
                    canvasContainerCtx.moveTo(x, 0);
                    canvasContainerCtx.lineTo(x, HEIGHT);
                }
                canvasContainerCtx.stroke();
            }
            drawBeats()

        }
        if(measureTickRef.current){
            const tickref = measureTickRef.current
            const tickCtx = tickref.getContext("2d");
            const WIDTH = tickref.width;
            const HEIGHT = tickref.height;
            tickCtx.clearRect(0,0,WIDTH,HEIGHT);
            tickCtx.fillStyle = "rgb(200,200,200)"
            tickCtx.fillRect(0,0,WIDTH,HEIGHT);
            tickCtx.lineWidth = 5;
            tickCtx.strokeStyle = "rgb(0,0,0)";
            tickCtx.beginPath();
            tickCtx.moveTo(0,HEIGHT);
            tickCtx.lineTo(WIDTH,HEIGHT);
            tickCtx.stroke();
            const sliceWidth = WIDTH/128;
            tickCtx.strokeStyle = "rgb(250,250,250)"
            tickCtx.lineWidth = 1;
            tickCtx.font = "16px sans-serif";
            tickCtx.fillStyle = "rgb(250,250,250)"; // or whatever your tick color scheme is
            for(let i=1;i<=128;i++){
                tickCtx.moveTo(i*sliceWidth,HEIGHT);
                if(i%4==0){
                    tickCtx.lineTo(i*sliceWidth,HEIGHT/2)
                    if(i>4){
                        tickCtx.fillText((i/4)-1, (i-4)*(sliceWidth)+(sliceWidth/12), 5*HEIGHT/6); 
                    }
                }else{
                    tickCtx.lineTo(i*sliceWidth,5*HEIGHT/6)
                }
            }
            tickCtx.stroke();
        }
        if(waveformRef.current){
            const canvasCtx = waveformRef.current.getContext("2d");
            const WIDTH = waveformRef.current.width;
            const HEIGHT = waveformRef.current.height;
            canvasCtx.clearRect(0,0,WIDTH,HEIGHT);   

            if(audio){
                const dataArray = audio.getChannelData(0);
                const bufferLength = dataArray.length;
                if(mouseDragEnd){
                    canvasCtx.fillStyle = "rgb(75,75,75)"
                
                    //const end = WIDTH*Math.ceil((mouseDragEnd.x-mouseDragStart.x)*128/WIDTH)/128;
                    canvasCtx.fillRect(mouseDragStart.x,0,mouseDragEnd.x-mouseDragStart.x,HEIGHT)
                }
                const drawWaveform = () => {
                    canvasCtx.lineWidth =  1;
                    canvasCtx.strokeStyle = "rgb(0,0,0)";
                    canvasCtx.globalAlpha = 1.0
                    const sliceWidth = (WIDTH/128.0)/(audioCtxRef.current.sampleRate*(60/BPM));
                    let x=0;
                    canvasCtx.beginPath();
                    for(let i=0;i<bufferLength;i+=1){
                        if(i===0){
                            canvasCtx.moveTo(0,HEIGHT/2);
                            x += sliceWidth;
                            continue
                        }
                        if(i-delayCompensation<0){
                            x += sliceWidth
                            continue
                        }
                        const v = (dataArray[i]);
                        const y = ((v+1) * HEIGHT)/2;
                        canvasCtx.lineTo((i-delayCompensation)*sliceWidth,y);
                        x += sliceWidth;
                        
                    }
                    canvasCtx.lineTo(WIDTH,HEIGHT/2);
                    canvasCtx.stroke();
                }
                drawWaveform();
                
            }
            }
    
    },[audio,BPM,mouseDragStart,mouseDragEnd,zoomFactor,delayCompensation]);

    const handleCanvasMouseDown = (e) => {
        const rect = waveformRef.current.getBoundingClientRect();
        const x = (e.clientX-rect.left)
        const start = rect.width*Math.floor(x*128/rect.width)/128;
        const coords = {x:start, xactual:x, y: e.clientY - rect.top}
        setIsDragging(true);
        setMouseDragStart(coords);
        setMouseDragEnd(null);
    };

    const handleCanvasMouseUp = (e) => {
        if (!isDragging) return;
        const rect = waveformRef.current.getBoundingClientRect();
        
        const x = e.clientX-rect.left
        if(Math.abs(mouseDragStart.xactual-x)<rect.width/128/4){
            playheadRef.current.style.transform = `translateX(${mouseDragStart.xactual}px)`
            setMouseDragEnd(null);
            socket.current.emit("send_play_window_to_server",{mouseDragStart,mouseDragEnd:null,roomID})
        }else{
            const start = rect.width*Math.ceil(x*128/rect.width)/128
            const pos = {x:start, y: e.clientY - rect.top}
            playheadRef.current.style.transform = `translateX(${mouseDragStart.x}px)`;
            setMouseDragEnd(pos);
            socket.current.emit("send_play_window_to_server",{mouseDragStart,mouseDragEnd:pos,roomID})
        }    
        setIsDragging(false);
    };


    return <div className="grid overflow-x-auto relative h-48"
                style={{width:1000}}>
                <canvas className="h-10 row-start-1 col-start-1"
                    style={{width:1000*Math.floor(zoomFactor)}}
                    width={1000*Math.floor(zoomFactor)}
                    height={40}
                    ref={measureTickRef}
                >
                </canvas>
                <canvas
                    ref={canvasContainerRef}
                    width={1000*Math.floor(zoomFactor)}
                    style={{width:`${Math.floor(1000*zoomFactor)}px`,imageRendering:"pixelated"}}
                    className="h-40 row-start-2 col-start-1"
                    >
                </canvas>
                <canvas 
                ref={waveformRef}
                width={1000*Math.floor(zoomFactor)}
                style={{width:1000*Math.floor(zoomFactor),imageRendering:"pixelated"}} 
                className={`h-40 row-start-2 col-start-1`}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                >
                </canvas>
                <div ref={playheadRef}
                    style={{position:"absolute",
                        top:0,bottom:0,
                        width:"2px",background:"red",
                        transform:"translateX(0)"
                    }}
                        >
                </div>
            </div> 
}