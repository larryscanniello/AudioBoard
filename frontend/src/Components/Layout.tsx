import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen text-blue-400 font-serif">
      <div className=''>
      <Outlet />
      </div>
    </div>
  );
}