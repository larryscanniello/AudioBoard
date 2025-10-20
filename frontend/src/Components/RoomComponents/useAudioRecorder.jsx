// useAudioRecorder.js
import { useRef, useEffect, useState } from 'react';

export const useAudioRecorder = (
  {AudioCtxRef, metronomeRef,socket, roomID, setAudio,
  setAudioChunks,setAudioURL,setDelayCompensation, setDelayCompensationAudio, 
  onDelayCompensationComplete, setMouseDragStart, setMouseDragEnd,    
  playheadRef,metronomeOn,waveformRef,BPM,scrollWindowRef,currentlyRecording,
  setPlayheadLocation
}
) => {
  const mediaRecorderRef = useRef(null);
  const delayCompensationRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const ffmpeg = new FFmpeg();
  

  // Initialize media stream and recorders
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("getUserMedia not supported on your browser!");
      return;
    }

    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        streamRef.current = stream;
        
        // Setup main recorder
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        let chunks = [];

        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = async (e) => {
          console.log("recorder stopped");
          // Send chunks to server
          for (let i = 0; i < chunks.length; i++) {
            socket.current.emit("send_audio_client_to_server", {
              audio: chunks[i],
              roomID,
              i,
              user: "all",
              length: chunks.length
            });
          }

          const blob = new Blob(chunks, { type: "audio/webm; codecs=opus" });
          const webmArrayBuffer = await blob.arrayBuffer();
          
          const decoded = await AudioCtxRef.current.decodeAudioData(webmArrayBuffer);
          setAudioChunks([...chunks]);
          setAudio(decoded);
          setMouseDragStart({x:0,xactual:0});
          setMouseDragEnd(null);
          setPlayheadLocation(0);
          chunks = [];

          //setAudioURL(audioURLtemp);
          
        };

        // Setup delay compensation recorder
        const delayCompRecorder = new MediaRecorder(stream);
        delayCompensationRecorderRef.current = delayCompRecorder;
        
        let delayChunks = [];

        delayCompRecorder.ondataavailable = (e) => {
          delayChunks.push(e.data);
        };

        delayCompRecorder.onstop = async (e) => {
            console.log("Delay compensation recorder stopped");
            const blob = new Blob(delayChunks, { type: "audio/ogg; codecs=opus" });
            const arrayBuffer = await blob.arrayBuffer();
            const decoded = await AudioCtxRef.current.decodeAudioData(arrayBuffer);
            setDelayCompensationAudio(decoded);
            let greatestAvg = 0;
            let greatestIndex = 0;
            const dataArray = decoded.getChannelData(0);
            for(let i=0;i<dataArray.length-50;i++){
                let avg = 0
                for(let j=i;j<i+50;j++){
                    avg += Math.abs(dataArray[j])/50;
                }
                if(avg>greatestAvg){
                    greatestAvg = avg;
                    greatestIndex = i
                }
            }
            setDelayCompensation(greatestIndex)
            delayChunks = [];
        };

      } catch (err) {
        console.error(`The following getUserMedia error occurred: ${err}`);
      }
    };

    initializeMedia();

    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [AudioCtxRef.current, roomID, socket, onDelayCompensationComplete]);

  // Recording control functions
  const startRecording = (metRef) => {
    if (mediaRecorderRef.current && metRef.current) {
        currentlyRecording.current = true;
        
        if(metronomeOn){
            metRef.current.start();
        }
        mediaRecorderRef.current.start();
        const now = AudioCtxRef.current.currentTime
        
        const updatePlayhead = () => {
                const rect = waveformRef.current.getBoundingClientRect();
                const pixelsPerSecond = rect.width/((60/BPM)*128)
                const waveformCtx = waveformRef.current.getContext("2d");
                const elapsed = AudioCtxRef.current.currentTime - now;
                setPlayheadLocation(elapsed);                
                const x = (elapsed * pixelsPerSecond);
                if(x>=waveformRef.current.width){
                  stopRecording(metRef);
                  return
                }
                const visibleStart = scrollWindowRef.current.scrollLeft
                const visibleEnd = visibleStart + 1000
                if((x-visibleStart)/(visibleEnd-visibleStart)>(10/11)){
                    scrollWindowRef.current.scrollLeft = 750 + visibleStart;
                }
                waveformCtx.clearRect(0,0,rect.width,rect.height)
                waveformCtx.fillStyle = "rgb(0,75,200)"
                waveformCtx.globalAlpha = .20
                waveformCtx.fillRect(0,0,x,rect.height)
                if(currentlyRecording.current){
                    requestAnimationFrame(updatePlayhead);
                }
            }
        updatePlayhead()
        console.log("Recording started");
    }
  }

  const stopRecording = (metRef) => {
    if (mediaRecorderRef.current && metRef.current) {
        currentlyRecording.current = false;
        metRef.current.stop();
        mediaRecorderRef.current.stop();
        console.log("Recording stopped");
    }
  }

  const startDelayCompensationRecording = (metRef) => {
    if (delayCompensationRecorderRef.current && metRef.current) {
      const prevtempo = metRef.current.tempo;
      metRef.current.tempo = 120;
      metRef.current.start();
      delayCompensationRecorderRef.current.start();
      console.log("Delay compensation recording started");
      setTimeout(() => {
        metronomeRef.current.stop();
        delayCompensationRecorderRef.current.stop();
        metRef.current.tempo = prevtempo
      }, 400);
    }
  }


  return {
    startRecording,
    stopRecording,
    startDelayCompensationRecording,
    isRecorderReady: !!mediaRecorderRef.current
  };
};
