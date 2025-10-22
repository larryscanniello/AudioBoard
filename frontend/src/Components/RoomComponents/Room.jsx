import AudioBoard from "./AudioBoard"
import { useEffect,useContext,useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../AuthProvider";
import io from "socket.io-client"

export default function Room(){
    const auth = useContext(AuthContext);
          if (!auth) {
            throw new Error("Home must be used inside AuthProvider");
          }
    const [isAuthorized, setIsAuthorized] = auth;
    const [roomResponse,setRoomResponse] = useState(false);
    const {roomID} = useParams();
    const socket = useRef(null);
    const [userList,setUserList] = useState([])

    useEffect(()=>{
        async function verifyRoom(){
            const response = await fetch(import.meta.env.VITE_BACKEND_URL+"/getroom/" + roomID, {
                credentials: "include",
                method: "GET",
            });
            if (response.ok) {
                setRoomResponse(true);
                console.log(`Attempting to join socket room: ${roomID}`);
            } else {
                setRoomResponse(false);
            }
        }
        verifyRoom()
        const newSocket = io(import.meta.env.VITE_BACKEND_URL, { withCredentials: true });
        socket.current = newSocket;
        socket.current.emit("join_room", roomID);
        socket.current.on("user_list_server_to_client",(userList)=>{
            setUserList(userList)
        })
    },[])

    return <div>
    {(roomResponse && isAuthorized) ? 
    <div>
        <AudioBoard isDemo={false} socket={socket}/>
        <div className="flex flex-col items-center">
            <div className="bg-white rounded-2xl mt-5 flex flex-col items-center">
                <div className="text-2xl mt-4">Room ID:</div>
                <div className="text-xs ml-4 mr-4">{roomID}</div>
                <div className="text-2xl mt-10">Room participants:</div>
                {userList && userList.map(([username,i],j) => <div key={j}>{username}</div>)}
                <div className="p-4"></div>
            </div>
        </div>
    </div> 
    : <div className="flex flex-col items-center"><div className="text-4xl pt-40">Wrong room or not authorized.</div></div>}
    </div>
}