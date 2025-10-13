// useAudioRecorder.js
import { useRef, useEffect, useCallback } from 'react';

export const useAudioRecorder = (
  {AudioCtxRef,
  metronomeRef,
  socket,
  roomID,
  setAudio,
  setAudioChunks,
  setAudioURL,
  setDelayCompensationAudio,
  onDelayCompensationComplete,
  setMouseDragStart,
  setMouseDragEnd,    
  playheadRef
}
) => {
  const mediaRecorderRef = useRef(null);
  const delayCompensationRecorderRef = useRef(null);
  const streamRef = useRef(null);

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

          const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
          const audioURLtemp = window.URL.createObjectURL(blob);
          const arrayBuffer = await blob.arrayBuffer();
          const decoded = await AudioCtxRef.current.decodeAudioData(arrayBuffer);
          
          setAudioChunks([...chunks]);
          setAudioURL(audioURLtemp);
          setAudio(decoded);
          setMouseDragStart({x:0,xactual:0});
          setMouseDragEnd(null);
          playheadRef.current.style.transform = "translateX(0)";
          
          
          chunks = [];
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
      metRef.current.start();
      mediaRecorderRef.current.start();
      console.log("Recording started");
    }
  }

  const stopRecording = (metRef) => {
    if (mediaRecorderRef.current && metRef.current) {
        metRef.current.stop();
        mediaRecorderRef.current.stop();
        console.log("Recording stopped");
        }
  }

  const startDelayCompensationRecording = (metRef) => {
    if (delayCompensationRecorderRef.current && metRef.current) {
      metRef.current.start();
      delayCompensationRecorderRef.current.start();
      console.log("Delay compensation recording started");
      
      // Auto-stop after 2 seconds
      setTimeout(() => {
        metronomeRef.current.stop();
        delayCompensationRecorderRef.current.stop();
      }, 1900);
    }
  }


  return {
    startRecording,
    stopRecording,
    startDelayCompensationRecording,
    isRecorderReady: !!mediaRecorderRef.current
  };
};
/*
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("getUserMedia supported.");
        navigator.mediaDevices
            .getUserMedia(
            // constraints - only audio needed for this app
            {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
                
            },
            )
            // Success callback
            .then((stream) => {
                const mediaRecorder = new MediaRecorder(stream);
                if(recordbuttonref.current && stoprecordingbuttonref.current){
                    recordbuttonref.current.onclick = () => {
                        metronomeRef.current.start()
                        mediaRecorder.start();
                        console.log(mediaRecorder.state);
                        console.log("recorder started");
                    };
                
                    let chunks = [];

                    mediaRecorder.ondataavailable = (e) => {
                        chunks.push(e.data);
                    }

                    stoprecordingbuttonref.current.onclick = () => {
                        metronomeRef.current.stop();
                        mediaRecorder.stop();
                        console.log(mediaRecorder.state);
                        console.log("recorder stopped");
                    };
                
                    mediaRecorder.onstop = async (e) => {
                        console.log("recorder stopped");
                        setAudioChunks(chunks);
                        for(let i=0;i<chunks.length;i++){
                            socket.current.emit("send_audio_client_to_server",{
                                audio:chunks[i],roomID,
                                i,user:"all"
                            })
                        }
                        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
                        chunks = [];
                        const audioURLtemp = window.URL.createObjectURL(blob);
                        console.log(blob)
                        setAudioURL(audioURLtemp);
                        const arrayBuffer = await blob.arrayBuffer()
                        const decoded = await AudioCtxRef.current.decodeAudioData(arrayBuffer)
                        setAudio(decoded);
                    };
                };
                const delayCompensationRecorder = new MediaRecorder(stream);
                if(delayCompensationPlayRef.current && delayCompensationRecordRef.current){
                    delayCompensationRecordRef.current.onclick = () => {
                        metronomeRef.current.start()
                        delayCompensationRecorder.start();
                        console.log(delayCompensationRecorder.state);
                        console.log("Delay compensation recorder started");
                        setTimeout(()=>{
                            metronomeRef.current.stop();
                            delayCompensationRecorder.stop();
                        },1800);
                    };
                
                    let chunks = [];

                    delayCompensationRecorder.ondataavailable = (e) => {
                        chunks.push(e.data);
                    }
                
                    delayCompensationRecorder.onstop = async (e) => {
                        console.log("recorder stopped");
                        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
                        chunks = [];
                        const arrayBuffer = await blob.arrayBuffer()
                        const decoded = await AudioCtxRef.current.decodeAudioData(arrayBuffer)
                        setDelayCompensationAudio(decoded)
                    
                    };
                }

            })
            // Error callback
            .catch((err) => {
            console.error(`The following getUserMedia error occurred: ${err}`);
            });
        } else {
        console.log("getUserMedia not supported on your browser!");
        }

*/