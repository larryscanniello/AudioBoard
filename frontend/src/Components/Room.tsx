import { useRef,useState,useEffect } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client"

export default function Room(){

    const recordbuttonref = useRef(null);
    const stoprecordingbuttonref = useRef(null);
    const playrecordingbuttonref = useRef(null);
    const [audioURL,setAudioURL] = useState(null);
    const [audio,setAudio] = useState(null);
    const canvasRef = useRef(null);
    const [BPM,setBPM] = useState(120);
    const [mouseDragStart,setMouseDragStart] = useState(null);
    const [mouseDragEnd,setMouseDragEnd] = useState(null);
    const [isDragging,setIsDragging] = useState(null);
    const audioObjectRef = useRef(null);
    const [socket,setSocket] = useState(null);
    const { roomID } = useParams();
    const [roomResponse,setRoomResponse] = useState(null);
    const [audioChunks,setAudioChunks] = useState([]);

    const AudioCtx = new AudioContext;

    useEffect(() => {
        const newSocket = io("http://localhost:3000", { withCredentials: true });
        console.log('socket',newSocket);
        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, []);

    useEffect(()=>{
        if(canvasRef.current){
            const canvasCtx = canvasRef.current.getContext("2d");
            const WIDTH = canvasRef.current.width;
            const HEIGHT = canvasRef.current.height;
            canvasCtx.clearRect(0,0,WIDTH,HEIGHT);
            canvasCtx.fillStyle = "rgb(200,200,200)";
            canvasCtx.fillRect(0,0,WIDTH,HEIGHT);
            
            if(audio){
                const dataArray = audio.getChannelData(0);
                const bufferLength = dataArray.length;
                if(mouseDragEnd){
                    console.log('check',mouseDragStart,mouseDragEnd)
                    canvasCtx.fillStyle = "rgb(75,75,75)"
                    canvasCtx.fillRect(mouseDragStart.x,0,mouseDragEnd.x-mouseDragStart.x,HEIGHT)
                }
                const drawBeats = () => {
                    canvasCtx.lineWidth = .25;
                    canvasCtx.strokeStyle = "rgb(100,100,100)";
                    canvasCtx.beginPath();
                    canvasCtx.globalAlpha = 1
                    canvasCtx.linewidth = 1
                    const sliceWidth = (WIDTH * 1.0) / bufferLength;
                    const samplesPerBeat = Math.floor(48000/(BPM/60))
                    let i=0;
                    while(i<bufferLength){
                        i += sliceWidth * samplesPerBeat
                        canvasCtx.moveTo(i,0)
                        canvasCtx.lineTo(i,HEIGHT)
                    }
                    canvasCtx.stroke()
                }
                drawBeats()
                const drawWaveform = () => {
                    canvasCtx.lineWidth = 1;
                    canvasCtx.strokeStyle = "rgb(0,0,0)";
                    canvasCtx.globalAlpha = 1.0
                    const sliceWidth = (WIDTH * 1.0) / bufferLength;
                    let x=0;
                    canvasCtx.beginPath();
                    for(let i=0;i<bufferLength;i+=1){
                        const v = dataArray[i]/1.1;
                        const y = ((v+1) * HEIGHT)/2;
                        if(i===0){
                            canvasCtx.moveTo(x,y);
                        }else{
                            canvasCtx.lineTo(x,y);
                        }

                        x += sliceWidth;
                        
                    }
                    canvasCtx.lineTo(WIDTH,HEIGHT/2);
                    canvasCtx.stroke();
                }
                drawWaveform();
                
            }
        }
    },[audio,BPM,mouseDragEnd])


    useEffect(() => {
        async function verifyRoom() {
        const response = await fetch("http://localhost:3000/getroom/" + roomID, {
            credentials: "include",
            method: "GET",
        });
        if (response.ok) {
            setRoomResponse(true);
            socket?.emit("join_room", roomID);
            console.log(`Attempting to join socket room: ${roomID}`);
        } else {
            setRoomResponse(false);
        }
    }
    verifyRoom();
  }, [socket, roomID]);

    useEffect(() => {
        if (audioChunks.length === 0) return;

        const processAudio = async () => {
            console.log('effectaudiochunks', audioChunks);
            const blob = new Blob(audioChunks, { type: "audio/ogg; codecs=opus" });

            const audioURLtemp = window.URL.createObjectURL(blob);
            setAudioURL(audioURLtemp);

            const arrayBuffer = await blob.arrayBuffer();
            const decoded = await AudioCtx.decodeAudioData(arrayBuffer);
            setAudio(decoded);

            const audioObject = new Audio(audioURLtemp);
            audioObjectRef.current = audioObject;
        };

        processAudio();
    }, [audioChunks]);

    useEffect(()=> {
        socket?.emit("send_play_window_to_server",{mouseDragStart,mouseDragEnd,roomID})
    },[mouseDragEnd?.x])

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("getUserMedia supported.");
        navigator.mediaDevices
            .getUserMedia(
            // constraints - only audio needed for this app
            {
                audio: true,
            },
            )
            // Success callback
            .then((stream) => {
                const mediaRecorder = new MediaRecorder(stream);
                if(recordbuttonref.current && stoprecordingbuttonref.current){
                    recordbuttonref.current.onclick = () => {
                        mediaRecorder.start();

                        console.log(mediaRecorder.state);
                        console.log("recorder started");
                    };
                
                    let chunks = [];

                    mediaRecorder.ondataavailable = (e) => {
                        chunks.push(e.data);
                    }

                    stoprecordingbuttonref.current.onclick = () => {
                        mediaRecorder.stop();
                        console.log(mediaRecorder.state);
                        console.log("recorder stopped");
                    };
                
                    mediaRecorder.onstop = async (e) => {
                        console.log("recorder stopped");
                        setAudioChunks(chunks);
                        for(let i=0;i<chunks.length;i++){
                            socket.emit("send_audio",{audio:chunks[i],roomID,i})
                        }
                        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
                        chunks = [];
                        const audioURLtemp = window.URL.createObjectURL(blob);
                        console.log(blob)
                        setAudioURL(audioURLtemp);
                        const arrayBuffer = await blob.arrayBuffer()
                        const decoded = await AudioCtx.decodeAudioData(arrayBuffer)
                        console.log(typeof decoded,decoded)
                        console.log('typeof',decoded)
                        setAudio(decoded);
                        const audioObject = new Audio(audioURLtemp);
                        audioObjectRef.current = audioObject
                    };


                };

            })
            
            // Error callback
            .catch((err) => {
            console.error(`The following getUserMedia error occurred: ${err}`);
            });
        } else {
        console.log("getUserMedia not supported on your browser!");
        }
    
    const analyser = AudioCtx.createAnalyser();
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    
   

    const handleCanvasMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const coords = {x: (e.clientX - rect.left)*scaleX, y: e.clientY - rect.top}
        
        setIsDragging(true);
        setMouseDragStart(coords);
        setMouseDragEnd(null);
    };

    const handleCanvasMouseUp = (e) => {
        if (!isDragging) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        console.log(e.clientX,rect.left)
        const pos = {x: (e.clientX - rect.left)*scaleX, y: e.clientY - rect.top}
        setMouseDragEnd(pos);
        setIsDragging(false);
    };


    const handlePlayAudioClick = () => {
        socket.emit("client_to_server_play_audio",{roomID})
    }

    const handlePlayAudio = () => {
        const audioObject = audioObjectRef.current;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        let startTime = 0
        let endTime = audioObject.duration
        if(mouseDragEnd&&mouseDragStart){
            startTime = audioObject.duration * mouseDragStart.x/ canvasRef.current.width
            endTime = audioObject.duration * mouseDragEnd.x/ canvasRef.current.width
        }
        audioObject.currentTime = startTime;
        console.log(startTime,endTime)
        audioObject.play();
        // Stop after the duration
        const duration = (endTime - startTime) * 1000; // Convert to milliseconds
        setTimeout(() => {
            audioObject.pause();
        }, duration);

    }


    if(socket){
        socket.on("request_audio",(data)=>{
            console.log('check1-3',data)
            if(audioChunks){
                console.log('typofaud',audioChunks);
                for(let i=0;i<audioChunks.length;i++){
                    socket.emit("send_audio",{audio:audioChunks[i],roomID,i})
                }
            }
            })

        socket.on("receive_audio", async (data) => {
            if(data.i==0){
                setAudioChunks([data.audio])
            }else {
                setAudioChunks(prev => [...prev, data.audio]);
            }
        });

        socket.on("send_play_window_to_clients", (data)=>{
            setMouseDragStart(data.mouseDragStart);
            setMouseDragEnd(data.mouseDragEnd);
        })
        socket.on("server_to_client_play_audio",(data)=>{
            handlePlayAudio();
        })
    }
    

    return <div className="">
        <div className="ml-12 mr-12 mt-12 flex justify-center">
            <canvas 
            ref={canvasRef} 
            className="w-200 h-40  border-black border-3 items-center rounded-2xl"
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            >
            </canvas></div>
        <button className="hover:bg-amber-400" ref={recordbuttonref}>Record</button>
        <button className="hover:bg-red-400" ref={stoprecordingbuttonref}>Stop</button>
        <button className="hover:bg-green-400" ref={playrecordingbuttonref}
            onClick={handlePlayAudioClick}
        
            >Play</button>
        {<div>Metronome: <form><input
            className='mt-4 pt-1 pb-1 pl-1 border text-black border-gray-700 rounded-md bg-gray-100'
            value={BPM}
            onChange={e => setBPM((prev)=>{const value = e.target.value;
              if(!/^[0-9]*$/.test(value)){
                return prev;
              }
              if(value.length>3){
                return prev;
              };
              return value;
              })}
            placeholder="BPM"
          /></form></div>}
        {audio && <div className="audio-container">
                    <audio src={audioURL} controls></audio>
                    <a download href={audioURL}>
                    Download Recording
                    </a>
                </div>}
        
         </div>
}