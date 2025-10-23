import { useRef,useState,useEffect } from "react";
import { useParams } from "react-router-dom";
import Metronome from "../../Classes/Metronome"
import { useAudioRecorder } from "./useAudioRecorder";
import RecorderInterface from "./RecorderInterface";
import { Button } from "@/Components/ui/button"
import { Play, Square, Circle,SkipBack,Lock,LockOpen,
    Columns4,Magnet,ChevronsDownUp,ChevronsUpDown } from "lucide-react"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@/Components/ui/button-group"
import { PiMetronomeDuotone } from "react-icons/pi";
import { Slider } from "@/Components/ui/slider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover"
import { FaMagnifyingGlass } from "react-icons/fa6";
import blackbirdDemo from "/audio/BlackbirdAudioBoarddemo.wav"

export default function AudioBoard({isDemo,socket}){

    const [audioURL,setAudioURL] = useState(null);
    const [audio,setAudio] = useState(null);
    const [BPM,setBPM] = useState(isDemo ? 80 : 120);
    const [mouseDragStart,setMouseDragStart] = useState(isDemo ? {trounded:2.25,t:2.25} : {trounded:0,t:0}); //time in seconds
    const [mouseDragEnd,setMouseDragEnd] = useState(isDemo ? {trounded:13.5,t:13.5}: null); //time in seconds
    const [roomResponse,setRoomResponse] = useState(null);
    const [audioChunks,setAudioChunks] = useState([]);
    const [zoomFactor,setZoomFactor] = useState(2);
    const [delayCompensation,setDelayCompensation] = useState([0]); //delayCompensation is in samples
    const [currentlyAdjustingLatency,setCurrentlyAdjustingLatency] = useState(null);
    const [displayDelayCompensationMessage,setDisplayDelayCompensationMessage] = useState(false);
    const [metronomeOn,setMetronomeOn] = useState(true);
    const [playheadLocation,setPlayheadLocation] = useState(isDemo ? 2.25 : 0);
    const [snapToGrid,setSnapToGrid] = useState(true);

    const waveformRef = useRef(null);
    const playheadRef = useRef(null);
    const delayCompensationSourceRef = useRef(null);
    const measureTickRef = useRef(null);
    const scrollWindowRef = useRef(null);

    const handlePlayAudioRef = useRef(null);
    const currentlyPlayingAudio = useRef(false); //this ref stores a bool depending on whether audio is playing
    const currentlyRecording = useRef(false);
    const playingAudioRef = useRef(null); //this ref stores an audio context source 
    const BPMRef = useRef(BPM);

    const metronomeRef = useRef(null);
    const AudioCtxRef = useRef(null);

    const { roomID } = useParams();

    const {startRecording,
            stopRecording,
            startDelayCompensationRecording,
            isRecorderReady} = useAudioRecorder({AudioCtxRef,metronomeRef,socket,roomID,
                                            setAudio,setAudioURL,setAudioChunks,
                                            setMouseDragStart,BPMRef,
                                            setMouseDragEnd,playheadRef,setDelayCompensation,
                                            metronomeOn,waveformRef,BPM,scrollWindowRef,
                                            currentlyRecording,setPlayheadLocation,isDemo,delayCompensation})
    

    useEffect(() => {
        //This effect runs only when component first mounts. 
        //Inititializes audio context, metronome, demo stuff, sockets
        AudioCtxRef.current = new AudioContext;
        metronomeRef.current = new Metronome;
        metronomeRef.current.audioContext = AudioCtxRef.current;
        const analyser = AudioCtxRef.current.createAnalyser();
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        const getDemo = async ()=>{
            const response = await fetch(blackbirdDemo)
            const arrayBuffer = await response.arrayBuffer();
            const decoded = await AudioCtxRef.current.decodeAudioData(arrayBuffer)
            setAudio(decoded);
        }
        if(isDemo){
            getDemo()
        }
        
        

        const processAudio = async (newchunks) => {
            const blob = new Blob(newchunks, { type: "audio/ogg; codecs=opus" });
            const audioURLtemp = window.URL.createObjectURL(blob);
            setAudioURL(audioURLtemp);
            const arrayBuffer = await blob.arrayBuffer();
            const decoded = await AudioCtxRef.current.decodeAudioData(arrayBuffer);
            setAudio(decoded);
        }

        const handleKeyDown = (e) => {
            e.preventDefault();
            if(e.key==="Enter"){
                setMouseDragStart({trounded:0,t:0});
                setMouseDragEnd(null);
                setPlayheadLocation(0);
                scrollWindowRef.current.scrollLeft = 0;
            }
            if(e.key===" "){
                if(currentlyRecording.current){
                    stopRecording(metronomeRef)
                }else if(currentlyPlayingAudio.current){
                    console.log('check1')
                    if(playingAudioRef.current){
                        playingAudioRef.current.stop()
                        socket.current.emit("stop_audio_client_to_server",roomID)
                    }
                }else{
                    handlePlayAudioRef.current()
                    socket.current.emit("client_to_server_play_audio",{roomID})
                }
            }
        }

        window.addEventListener("keydown",handleKeyDown)
        
        if(!isDemo){
            socket.current.on("receive_audio_server_to_client", async (data) => {
                console.log(data)
                if(data.i==0){
                    setAudioChunks(()=>{
                        if(data.length===1){
                            processAudio([data.audio])
                            setMouseDragStart({trounded:0,t:0});
                            setMouseDragEnd(null);
                            setPlayheadLocation(0);
                        }
                        return [data.audio]
                    })
                }else {
                    setAudioChunks(prev => {
                        if(data.i!=prev.length){
                            return prev
                        }

                        const newchunks = [...prev, data.audio]
                        
                        if(data.length==newchunks.length){
                            processAudio(newchunks);
                            setMouseDragStart({trounded:0,t:0});
                            setMouseDragEnd({trounded:0,t:0});
                            setPlayheadLocation(0);
                        }
                        return newchunks
                    });
                }
                setDelayCompensation(data.delayCompensation)
            });
            
            socket.current.on("send_play_window_to_clients", (data)=>{
                setMouseDragStart(data.mouseDragStart);
                setMouseDragEnd(data.mouseDragEnd);
                const start = data.mouseDragEnd ? data.mouseDragStart.trounded : data.mouseDragStart ? data.mouseDragStart.t : 0;
                const pxPerSecond = Math.floor(1000*zoomFactor)/(128*60/BPM)
                setPlayheadLocation(start/pxPerSecond)
            })

            socket.current.on("server_to_client_play_audio",(data)=>{
                handlePlayAudioRef.current();
            })
            
            socket.current.on("request_audio_server_to_client", (data) => {
                setAudioChunks(currentChunks => {
                    if(currentChunks && currentChunks.length > 0){
                        for(let i = 0; i < currentChunks.length; i++){
                            socket.current.emit("send_audio_client_to_server", {
                                audio: currentChunks[i],roomID,
                                i,user: data.user,
                                length: currentChunks.length,
                                delayCompensation,
                            });
                        }
                    }
                    return currentChunks;
                });
            })
            
            socket.current.on("send_bpm_server_to_client",bpm=>{
                setBPM(bpm);
            });

            socket.current.on("stop_audio_server_to_client",()=>{
                if(playingAudioRef.current){
                    playingAudioRef.current.stop();
                }
                stopRecording(metronomeRef);
                metronomeRef.current.stop();
            })
        }

        


        return ()=>{
            if(!isDemo){
                socket.current.disconnect();
            }
            AudioCtxRef.current?.close();
            window.removeEventListener("keydown",handleKeyDown)
        }

        
    }, []);


    useEffect(() => {
        handlePlayAudioRef.current = handlePlayAudio;
    });

    if(metronomeRef.current){
        metronomeRef.current.tempo = BPM;
    }

    const handlePlayAudio = () => {
        //This function handles the dirty work of playing audio correctly no matter where the playhead is
        if(!audio) return;
        const source = AudioCtxRef.current.createBufferSource();
        //Need to create a copy of the audio to send to both ears
        const stereoBuffer = AudioCtxRef.current.createBuffer(2, audio.length, AudioCtxRef.current.sampleRate);
        stereoBuffer.getChannelData(0).set(audio.getChannelData(0));
        stereoBuffer.getChannelData(1).set(audio.getChannelData(0));
        source.buffer = stereoBuffer;
        source.connect(AudioCtxRef.current.destination);
        source.onended = () => {
            currentlyPlayingAudio.current=false;
        }
        const rect = waveformRef.current.getBoundingClientRect();
        //Pixels per second calculates the rate at which the playhead must move. Depends on BPM
        //Divides full width of canvas by the total time in seconds 128 beats takes
        const pixelsPerSecond = rect.width/((60/BPM)*128)
        //totalTime is is length of time if audio the length of entire canvas is played
        const totalTime = (128*60/BPM)
        const duration = source.buffer.length/AudioCtxRef.current.sampleRate;
        //startTime, endTime are relative to the audio, not absolute times, in seconds
        let startTime = 0;
        let endTime = Math.min(duration,totalTime);
        let timeToNextMeasure = 0; //seconds
        if(mouseDragStart&&(!mouseDragEnd||!snapToGrid)){
            //This if handles startTime if no region is selected and there is no snap to grid
            //startTime is totalTime times (pixels so far)/(total pixels in canvas)
            startTime = totalTime * mouseDragStart.t*pixelsPerSecond/waveformRef.current.width;
            //find the next beat so metronome is aligned
            const nextBeat = 128*mouseDragStart.t*pixelsPerSecond/waveformRef.current.width
            metronomeRef.current.currentBeatInBar = Math.ceil(nextBeat)%4
            const beatFractionToNextMeasure = Math.ceil(nextBeat)-nextBeat
            const secondsPerBeat = (60/BPM)
            timeToNextMeasure = beatFractionToNextMeasure * secondsPerBeat
        }else if(mouseDragStart&&mouseDragEnd&&snapToGrid){
            //startTime is totalTime times (pixels so far)/(total pixels in canvas)
            startTime = totalTime * mouseDragStart.trounded*pixelsPerSecond/ waveformRef.current.width;
            const currBeat = 128*mouseDragStart.trounded*pixelsPerSecond/waveformRef.current.width
            //this assumes that we are snapping to grid, so we use floor instead of ceil here
            //so that the first beat of selected region plays
            metronomeRef.current.currentBeatInBar = Math.floor(currBeat)%4
        }
        if(mouseDragEnd&&!snapToGrid){
            endTime = totalTime * Math.min(1,mouseDragEnd.t*pixelsPerSecond/ waveformRef.current.width);
        }else if(mouseDragEnd&&snapToGrid){
            endTime = totalTime * Math.min(1,mouseDragEnd.trounded*pixelsPerSecond/ waveformRef.current.width);
        }
        //add .05 to match the delay of audio/metronome (metronome needs delay for first beat to sound)
        let now = AudioCtxRef.current.currentTime+.05;
        //updatePlayhead uses requestAnimationFrame to animate the playhead
        //note we need the start parameter to keep track of where in the audio we are starting
        //as opposed to now which is the current time absolutely
        const updatePlayhead = (start) => {
            const elapsed = AudioCtxRef.current.currentTime - now;
            setPlayheadLocation(start+elapsed);
            const x = (start+elapsed) * pixelsPerSecond;
            //auto scroll right if playhead moves far right enough
            const visibleStart = scrollWindowRef.current.scrollLeft
            const visibleEnd = visibleStart + 1000
            if((x-visibleStart)/(visibleEnd-visibleStart)>(10/11)){
                scrollWindowRef.current.scrollLeft = 750 + visibleStart;
            }
            if(start+elapsed<endTime&&currentlyPlayingAudio.current){
                requestAnimationFrame(()=>{updatePlayhead(start)});
            }else if(!mouseDragEnd){
                //if no region has been dragged, and end is reached, reset playhead to the beginning
                metronomeRef.current.stop();
                setMouseDragStart({trounded:0,t:0})
                setMouseDragEnd(null)
                setPlayheadLocation(0)
            }else{
                //if a region has been dragged, reset playhead to 
                metronomeRef.current.stop();
                setPlayheadLocation(start)
            }
            
        }
        const secondsToDelay = delayCompensation/AudioCtxRef.current.sampleRate //convert delayComp in samples to seconds
        if(startTime+secondsToDelay>=audio.getChannelData(0).length/AudioCtxRef.current.sampleRate){
            //if someone tries to play audio after the end of the audio, play audio from the beginning
            startTime = 0;
            endTime = duration;
            timeToNextMeasure = 0;
            setMouseDragStart({trounded:0,t:0})
            setMouseDragEnd(null)
            start = 0;
        }
        if(metronomeOn){
            //the .05 added to now previously was for playhead rendering purposes, we need to subtract it here
            metronomeRef.current.start(now-.05+timeToNextMeasure);
        }
        //source.start arguments are (time to wait to play audio,location in audio to start,duration to play)
        source.start(AudioCtxRef.current.currentTime+.05,startTime+secondsToDelay,endTime-startTime)
        playingAudioRef.current = source;
        currentlyPlayingAudio.current = true;
        updatePlayhead(startTime)
    }

    const handleTempoMouseDown = (e) => {
        //handles the BPM adjuster
        if(currentlyPlayingAudio.current||currentlyRecording.current){
            return
        }
        e.preventDefault();
        const startY = e.clientY;
        const startBPM = BPM;

        const handleMouseMove = (e) => {
            const deltaY = (startY - e.clientY)/2;
            setBPM(prev=>{
                const newbpm = startBPM + Math.floor(deltaY)
                if(30<=newbpm&&newbpm<=400){
                    BPMRef.current = newbpm
                    return newbpm
                }else{
                    return prev
                }
            });
        };

        const handleMouseUp = () => {
            if(BPMRef.current&&!isDemo){
                socket.current.emit("receive_bpm_client_to_server",{roomID,BPM:BPMRef.current})
            }
            console.log('check876')
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const handleSkipBack = () => {
        if(!currentlyPlayingAudio.current&&!currentlyRecording.current){
            setMouseDragEnd(null);
            setMouseDragStart({trounded:0,t:0});
            scrollWindowRef.current.scrollLeft = 0;
            setPlayheadLocation(0);
        }
    }

    let delayCompensationStep;
    if(AudioCtxRef.current){
        delayCompensationStep = Math.floor(AudioCtxRef.current.sampleRate * .01);
    }else{
        delayCompensationStep = 410;
    }
    

    return <div className="">
        <div className="w-full grid place-items-center items-center">
            <div className="grid grid-rows-[1px_172px] h-58 bg-gray-700 border-gray-500 border-4 rounded-2xl shadow-gray shadow-md"
                style={{width:1050}}>
                <div className="relative row-start-2 grid place-items-center items-center h-43">
                    <RecorderInterface audio={audio} BPM={BPM} mouseDragEnd={mouseDragEnd} zoomFactor={zoomFactor}
                                delayCompensation={delayCompensation} measureTickRef={measureTickRef}
                                mouseDragStart={mouseDragStart}
                                audioCtxRef={AudioCtxRef} waveformRef={waveformRef}
                                playheadRef={playheadRef} setMouseDragStart={setMouseDragStart}
                                setMouseDragEnd={setMouseDragEnd} socket={socket} roomID={roomID}
                                scrollWindowRef={scrollWindowRef} playheadLocation={playheadLocation}
                                setPlayheadLocation={setPlayheadLocation} audioURL={audioURL}
                                snapToGrid={snapToGrid} currentlyPlayingAudio={currentlyPlayingAudio}
                                setSnapToGrid={setSnapToGrid} isDemo={isDemo}
                    />
                    <Button variant="default" size="lg" onClick={()=>setSnapToGrid(prev=>!prev)} 
                        className="border-1 border-gray-300 hover:bg-gray-800"
                        style={{position:"absolute",right:15,top:120,transform:"scale(.7)"}}>
                        <Magnet color={snapToGrid ? "lightblue" : "white"} style={{transform:"rotate(315deg) scale(1.5)"}}></Magnet>
                        <Columns4 color={snapToGrid ? "lightblue" : "white"} style={{transform:"scale(1.5)"}}></Columns4>
                    </Button>
                </div>
                
                <div className="row-start-3 h-8 grid grid-cols-[20px_375px_125px_125px_125px_125px]" >
                    <ButtonGroup className="rounded border-1 border-gray-300 col-start-2">
                        <Button variant="default" size="lg" className="hover:bg-gray-800"
                            onClick={()=>{
                                if(!currentlyPlayingAudio.current&&!currentlyRecording.current){
                                    handlePlayAudio();
                                    if(!isDemo){
                                        socket.current.emit("client_to_server_play_audio",{roomID})
                                    }
                                }    
                                }}>
                            <Play color={"lightgreen"} style={{width:20,height:20}}/> 
                        </Button>
                        <ButtonGroupSeparator/>
                        <Button variant="default" size="lg" className="hover:bg-gray-800"
                            onClick={()=>{
                                    console.log('check3')
                                    if(playingAudioRef.current){
                                        playingAudioRef.current.stop();
                                    }
                                    stopRecording(metronomeRef);
                                    metronomeRef.current.stop();
                                    socket.current.emit("stop_audio_client_to_server",roomID)
                                }}>
                            <Square color={"lightblue"} className="" style={{width:20,height:20}}/>
                        </Button>
                        <ButtonGroupSeparator/>
                        <Button 
                            variant="default" size="lg" className="hover:bg-gray-800"
                            onClick={()=>{
                                if(!currentlyPlayingAudio.current&&!currentlyRecording.current){
                                    startRecording(metronomeRef);
                                }
                            }}
                        >
                            <Circle color={"red"}className="" style={{width:20,height:20}}/>
                        </Button>
                        <ButtonGroupSeparator/>
                        <Button variant="default" size="lg" className="hover:bg-gray-800"
                            onClick={handleSkipBack}
                            >
                            <SkipBack style={{width:20,height:20}} color="orange"/>
                        </Button>
                        <ButtonGroupSeparator/>
                        <Button variant="default" size="lg" className="hover:bg-gray-800"
                                onClick={()=>{
                                    if(!currentlyPlayingAudio.current&&!currentlyRecording.current){
                                        setMetronomeOn(prev=>!prev)
                                    }
                                }}>
                            <PiMetronomeDuotone style={{width:20,height:20}} 
                                                color={metronomeOn ? "pink" : ""}
                                                />
                        </Button>
                        <ButtonGroupSeparator/>
                        <Button variant="default" size="lg" onMouseDown={handleTempoMouseDown}>
                            {BPM}
                        </Button>
                    </ButtonGroup>
                    <div className="flex flex-row items-center col-start-3">
                        <FaMagnifyingGlass style={{transform:"scale(1.1)",marginRight:3}} className="text-blue-200"/>
                        <Slider style={{width:100}}
                        defaultValue={[20000/32]} max={1000} min={0} step={1} 
                            className="pl-2 group" value={[Math.log10(zoomFactor)/Math.log10(10**(Math.log10(16)/1000))]} onValueChange={(value)=>{
                                setZoomFactor(prev => {
                                    /*if(currentlyPlayingAudio.current||currentlyRecording.current){
                                        return prev
                                    }*/
                                    const b = 10**(Math.log10(16)/1000)
                                    const newZoomFactor = b**value
                                    return newZoomFactor
                                })

                            }}>
                        </Slider>
                    </div>
                    <Popover>
                        <PopoverTrigger className="col-start-4 hover:underline text-blue-200">Latency</PopoverTrigger>
                        <PopoverContent onCloseAutoFocus={()=>setDisplayDelayCompensationMessage(false)}>
                            <div>Place your microphone near your speakers,
                                turn your volume up,
                            then hit the record button.</div>  
                            <div className="grid place-items-center p-4">
                                <Button 
                                    variant="default" size="lg" className="bg-white hover:bg-gray-300 border-1 border-gray-400"
                                    onClick={()=>{
                                        startDelayCompensationRecording(metronomeRef);
                                        setTimeout(()=>setDisplayDelayCompensationMessage(true),1000)
                                    }}
                                    >
                                    <Circle color={"red"}className="" style={{width:20,height:20}}/>
                                </Button>
                            </div>
                            {displayDelayCompensationMessage && <div className="text-green-600">
                                Latency compensatation attempted successfully.</div>}
                            <div className="pt-4">Alternatively, adjust it manually:
                                <Slider style={{width:100}} max={20000} step={delayCompensationStep}
                                    onValueChange={(value)=>setDelayCompensation(value)} className="p-4"
                                    value={delayCompensation}
                                    > 

                                </Slider>
                            </div>

                        </PopoverContent>
                    </Popover>
                    {/*<a download href={audioURL} className={"flex items-center col-start-5 " + (audio ? "hover:underline" : "opacity-25")}>
                    Download
                    </a>*/}
                    
                </div>
            </div>
        </div>
        </div>
}