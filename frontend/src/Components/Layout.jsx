import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-white text-black bg-gradient-to-tl from-gray-200 to-blue-200 font-serif">
      <div className=''>
      <Outlet />
      </div>
    </div>
  );
}