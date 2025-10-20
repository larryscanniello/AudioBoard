import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-white text-black  from-white to-indigo-200 font-serif">
      <div className=''>
      <Outlet />
      </div>
    </div>
  );
}