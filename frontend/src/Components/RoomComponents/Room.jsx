import { useRef,useState,useEffect } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client"
import Metronome from "../../Classes/Metronome"
import { useAudioRecorder } from "./useAudioRecorder";
import RecorderInterface from "./recorderInterface";
import { Button } from "@/components/ui/button"
import { Play, Square, Circle,SkipBack } from "lucide-react"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@/components/ui/button-group"
import { PiMetronomeDuotone } from "react-icons/pi";
import { Slider } from "@/components/ui/slider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FaMagnifyingGlass } from "react-icons/fa6";

export default function Room(){

    const playrecordingbuttonref = useRef(null);
    const [audioURL,setAudioURL] = useState(null);
    const [audio,setAudio] = useState(null);
    const waveformRef = useRef(null);
    const [BPM,setBPM] = useState(120);
    const [mouseDragStart,setMouseDragStart] = useState(null);
    const [mouseDragEnd,setMouseDragEnd] = useState(null);
    const [isDragging,setIsDragging] = useState(null);
    const audioObjectRef = useRef(null);
    const { roomID } = useParams();
    const [roomResponse,setRoomResponse] = useState(null);
    const [audioChunks,setAudioChunks] = useState([]);
    const playheadRef = useRef(null);
    const [zoomFactor,setZoomFactor] = useState(8);
    const [delayCompensation,setDelayCompensation] = useState(0);
    const delayCompensationSourceRef = useRef(null);
    const measureTickRef = useRef(null);
    const metronomeRef = useRef(null);
    const delayCompensationRecordRef = useRef(null);
    const delayCompensationPlayRef = useRef(null);
    const [delayCompensationAudio,setDelayCompensationAudio] = useState(null);
    const [currentlyAdjustingLatency,setCurrentlyAdjustingLatency] = useState(null);
    const playingAudioRef = useRef(null);
    const currentlyPlayingAudio = useRef(false);
    const socket = useRef(null);
    const AudioCtxRef = useRef(null);
    const handlePlayAudioRef = useRef(null);
    const [displayDelayCompensationMessage,setDisplayDelayCompensationMessage] = useState(false);
    const [metronomeOn,setMetronomeOn] = useState(true);
    const {startRecording,
        stopRecording,
        startDelayCompensationRecording,
        isRecorderReady} = useAudioRecorder({AudioCtxRef,metronomeRef,socket,roomID,
                                            setAudio,setAudioURL,setAudioChunks,
                                            setDelayCompensationAudio,setMouseDragStart,
                                            setMouseDragEnd,playheadRef,setDelayCompensation,
                                            metronomeOn,waveformRef,BPM})
    
    

    useEffect(() => {
        AudioCtxRef.current = new AudioContext;
        metronomeRef.current = new Metronome;
        metronomeRef.current.audioContext = AudioCtxRef.current;
        const newSocket = io("http://localhost:3000", { withCredentials: true });
        socket.current = newSocket;
        const analyser = AudioCtxRef.current.createAnalyser();
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;

        const processAudio = async (newchunks) => {
            console.log('check04')
            const blob = new Blob(newchunks, { type: "audio/ogg; codecs=opus" });
            const audioURLtemp = window.URL.createObjectURL(blob);
            setAudioURL(audioURLtemp);
            const arrayBuffer = await blob.arrayBuffer();
            const decoded = await AudioCtxRef.current.decodeAudioData(arrayBuffer);
            setAudio(decoded);
        }

        const handleEnterKey = (e) => {
            if(e.key==="Enter"){
                setMouseDragStart({x:0,xactual:0});
                setMouseDragEnd(null);
                playheadRef.current.style.transform = "translateX(0px)"
            }
        }

        window.addEventListener("keydown",handleEnterKey)
        

        socket.current.on("receive_audio_server_to_client", async (data) => {
            console.log('loam',data)
            if(data.i==0){
                setAudioChunks(()=>{
                    if(data.length===1){
                        processAudio([data.audio])
                        setMouseDragStart({x:0,xactual:0});
                        setMouseDragEnd({x:0});
                        playheadRef.current.style.transform = "translateX(0)";
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
                        console.log('1234')
                        processAudio(newchunks);
                        setMouseDragStart({x:0,xactual:0});
                        setMouseDragEnd({x:0});
                        playheadRef.current.style.transform = "translateX(0)";
                    }
                    return newchunks
                });
            }
        });
        
        socket.current.on("send_play_window_to_clients", (data)=>{
            console.log('333')
            setMouseDragStart(data.mouseDragStart);
            setMouseDragEnd(data.mouseDragEnd);
            const start = data.mouseDragEnd ? data.mouseDragStart.x : data.mouseDragStart ? data.mouseDragStart.xactual : 0;
            playheadRef.current.style.transform = `translateX(${start}px)`
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
                            length: currentChunks.length
                        });
                    }
                }
                return currentChunks;
            });
        });
        async function verifyRoom() {
            const response = await fetch("http://localhost:3000/getroom/" + roomID, {
                credentials: "include",
                method: "GET",
            });
            if (response.ok) {
                setRoomResponse(true);
                socket.current.emit("join_room", roomID);
                console.log(`Attempting to join socket room: ${roomID}`);
            } else {
                setRoomResponse(false);
            }
        }

        verifyRoom();


        return ()=>{
            socket.current.disconnect();
            AudioCtxRef.current?.close();
            window.removeEventListener("keydown",handleEnterKey)
        }

        
    }, []);


    useEffect(() => {
        handlePlayAudioRef.current = handlePlayAudio;
    });

    if(metronomeRef.current){
        metronomeRef.current.tempo = BPM;
    }

    const handlePlayAudio = () => {
        const source = AudioCtxRef.current.createBufferSource();
        source.buffer = audio;
        source.connect(AudioCtxRef.current.destination);
        source.onended = () => {
            currentlyPlayingAudio.current=false;
        }
        const rect = waveformRef.current.getBoundingClientRect();
        const totalTime = (128*60/BPM)
        const duration = source.buffer.length/AudioCtxRef.current.sampleRate;
        const waveformWidth = rect.width
        let startTime = 0;
        let endTime = duration;
        let timeToNextMeasure = 0;
        if(mouseDragStart&&!mouseDragEnd){
            startTime = totalTime * mouseDragStart.xactual/ waveformRef.current.width;
            const nextBeat = 128*mouseDragStart.xactual/waveformRef.current.width
            metronomeRef.current.currentBeatInBar = Math.ceil(nextBeat)%4
            const beatFractionToNextMeasure = Math.ceil(nextBeat)-nextBeat
            const secondsPerBeat = (60/BPM)
            timeToNextMeasure = beatFractionToNextMeasure * secondsPerBeat
        }else if(mouseDragStart&&mouseDragEnd){
            startTime = totalTime * mouseDragStart.x/ waveformRef.current.width;
            metronomeRef.current.currentBeatInBar = Math.floor(128*mouseDragStart.x/waveformRef.current.width)%4
        }
        if(mouseDragEnd){
            endTime = totalTime * mouseDragEnd.x/ waveformRef.current.width;
        }
        let now = AudioCtxRef.current.currentTime;
        const pixelsPerSecond = rect.width/((60/BPM)*128)
        const updatePlayhead = () => {
            const elapsed = AudioCtxRef.current.currentTime - now;
            const start = mouseDragEnd ? mouseDragStart.x : mouseDragStart ? mouseDragStart.xactual : 0;
            const x = start+(elapsed * pixelsPerSecond);
            playheadRef.current.style.transform = `translateX(${x}px)`;
            if(AudioCtxRef.current.currentTime<now+endTime&&currentlyPlayingAudio.current){
                requestAnimationFrame(updatePlayhead);
            }else{
                metronomeRef.current.stop();
            }
        }
                        
        const secondsToDelay = delayCompensation/AudioCtxRef.current.sampleRate
        if(metronomeOn){
            metronomeRef.current.start(now+timeToNextMeasure);
        }
        console.log('src',source,startTime+secondsToDelay,endTime-startTime,endTime)
        source.start(0,startTime+secondsToDelay,endTime-startTime)
        playingAudioRef.current = source;
        currentlyPlayingAudio.current = true;
        updatePlayhead()
    }

    const SetDelayCompensation = () => {
        if(!currentlyAdjustingLatency){
        }else{
            delayCompensationSourceRef.current.stop();
            metronomeRef.current.stop();
        }
        setCurrentlyAdjustingLatency(prev=>!prev)
    }

    if(currentlyAdjustingLatency){
        if(delayCompensationSourceRef.current){
            delayCompensationSourceRef.current.stop();
        }
        if(metronomeRef.current){
            metronomeRef.current.stop();
        }
        const source = AudioCtxRef.current.createBufferSource();
        source.buffer = delayCompensationAudio;
        source.connect(AudioCtxRef.current.destination);
        const start = AudioCtxRef.current.currentTime;
        source.start(0,delayCompensation/AudioCtxRef.current.sampleRate);
        metronomeRef.current.start();
        delayCompensationSourceRef.current = source;
    }

    const handleTempoMouseDown = (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startBPM = BPM;

        const handleMouseMove = (e) => {
            const deltaY = (startY - e.clientY)/2;
            setBPM(prev=>{
                const newbpm = startBPM + Math.floor(deltaY)
                if(30<=newbpm&&newbpm<=400){
                    return newbpm
                }else{
                    return prev
                }
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
};

    const handleSkipBack = () => {
        setMouseDragEnd(null);
        setMouseDragStart({x:0,xactual:0});
        playheadRef.current.style.transform = "translateX(0px)"
    }



    return <div className="">
        <div className="w-full grid place-items-center items-center">
            <div className="grid h-80 bg-gray-700 rounded-2xl"
                style={{width:1100}}>
                <div className="grid place-items-center items-center">
                    <RecorderInterface audio={audio} BPM={BPM} mouseDragEnd={mouseDragEnd} zoomFactor={zoomFactor}
                                delayCompensation={delayCompensation} measureTickRef={measureTickRef}
                                setIsDragging={setIsDragging} mouseDragStart={mouseDragStart}
                                audioCtxRef={AudioCtxRef} waveformRef={waveformRef}
                                playheadRef={playheadRef} isDragging={isDragging} setMouseDragStart={setMouseDragStart}
                                setMouseDragEnd={setMouseDragEnd} socket={socket} roomID={roomID}
                                />
                </div>
                <div className="grid grid-rows-1 grid-cols-3 place-items-center items-center">
                    <ButtonGroup className="rounded border-1 border-gray-300">
                        <Button variant="default" size="lg" className="hover:bg-gray-800"
                            onClick={()=>{handlePlayAudio();socket.current.emit("client_to_server_play_audio",{roomID})}}>
                            <Play color={"lightgreen"} style={{width:20,height:20}}/> 
                        </Button>
                        <ButtonGroupSeparator/>
                        <Button variant="default" size="lg" className="hover:bg-gray-800"
                            onClick={()=>{
                                    if(playingAudioRef.current){
                                        playingAudioRef.current.stop();
                                    }
                                    stopRecording(metronomeRef);
                                    metronomeRef.current.stop();
                                }}>
                            <Square color={"lightblue"} className="" style={{width:20,height:20}}/>
                        </Button>
                        <ButtonGroupSeparator/>
                        <Button 
                            variant="default" size="lg" className="hover:bg-gray-800"
                            onClick={()=>{startRecording(metronomeRef)}}
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
                                onClick={()=>setMetronomeOn(prev=>!prev)}>
                            <PiMetronomeDuotone style={{width:20,height:20}} 
                                                color={metronomeOn ? "pink" : ""}
                                                />
                        </Button>
                        <ButtonGroupSeparator/>
                        <Button variant="default" size="lg" onMouseDown={handleTempoMouseDown}>
                            {BPM}
                        </Button>
                    </ButtonGroup>
                    <div className="flex"><FaMagnifyingGlass/>
                    <Slider style={{width:100}} defaultValue={[5000]} max={5000} min={10000/32} step={1} 
                        className="pl-2" onValueChange={(value)=>{
                            if(value<=5000){
                                setZoomFactor(value*(32/10000))
                            }else{
                                setZoomFactor(4*(value-5000)*(32/10000)+5000*(32/10000))
                            }
                        }}>
                    </Slider>
                    </div>
                    <Popover >
                        <PopoverTrigger className="hover:underline">Latency</PopoverTrigger>
                        <PopoverContent onCloseAutoFocus={()=>setDisplayDelayCompensationMessage(false)}>
                            <div>Place your microphone near your speakers,
                                turn your volume up,
                            then hit the record button.</div>  
                            <div className="grid place-items-center p-4">
                                <Button 
                                    variant="default" size="lg" className="bg-white hover:bg-gray-300 border-1 border-gray-400"
                                    onClick={()=>{
                                        startDelayCompensationRecording(metronomeRef);
                                        setTimeout(()=>setDisplayDelayCompensationMessage(true),300)
                                    }}
                                    >
                                    <Circle color={"red"}className="" style={{width:20,height:20}}/>
                                </Button>
                            </div>
                            {displayDelayCompensationMessage && <div className="text-green-600">Latency compensated successfully.</div>}
                            <div className="pt-4">Alternatively, adjust it manually:
                                <Slider style={{width:100}} max={10000} step={1}
                                    onValueChange={(value)=>setDelayCompensation(value)} className="p-4"
                                    value={[delayCompensation]}
                                    >

                                </Slider>
                            </div>

                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
        {audio && <div className="audio-container">
                    <audio src={audioURL} controls></audio>
                    <a download href={audioURL}>
                    Download Recording
                    </a>
                </div>}
        
         </div>
}