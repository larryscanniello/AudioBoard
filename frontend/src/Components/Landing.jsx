import AudioBoard from "./RoomComponents/AudioBoard.jsx"
import { Circle,Pointer,Play,Wifi } from "lucide-react"
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

//bg-[rgb(30,175,220)]/40

export default function Landing() {
  const navigate = useNavigate();

  return <div>
        <div className="flex items-center justify-center">
          <h6 className="m-8 text-4xl">AudioBoard: A whiteboard for remote music lessons</h6>
        </div>
        <div className="p-4"> 
          <AudioBoard/>
        </div>
        
        <div className="w-full flex flex-col items-center">
            <ul className="pt-10 text-xl flex flex-col "> 
              <li className="p flex"><Wifi color={"purple"} size={25} 
              className="w-8 h-8 p-2 mr-2 rounded border-gray-400"/><div>Join a room and connect with your teacher</div></li>
              <li className="p flex"><Circle color={"red"} size={25} 
              className="w-8 h-8 p-2 mr-2 rounded border-gray-400"/><div>Record directly in the browser</div></li>
              <li className="p flex"><Pointer color={"blue"} size={25} 
              className="w-8 h-8 p-2 mr-2 rounded border-gray-400"/>Drag the mouse to select a playback region</li>
              <li className="p flex"><Play color={"green"} size={25} 
              className="w-8 h-8 p-2 mr-2 rounded border-gray-400"/>Synchronized playback lets student and teacher hear the same thing</li>
            </ul>
        </div>
        <div className="w-full flex flex-col items-center mt-10 text-xl">
          <div className="text-3xl mb-2">Join a room:</div>
            <a className="pt-2 pb-2 pl-8 pr-8 rounded-3xl bg-blue-200 hover:bg-blue-300 flex flex-row"
              href="http://localhost:3000/auth/google">
                <div>Login with</div> 
                <FcGoogle style={{transform:"scale(1.2)",marginTop:"2.5px",marginLeft:"8px"}}/>
            </a>
        </div>
        
  </div>
  
  
  
}