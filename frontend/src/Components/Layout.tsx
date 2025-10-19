import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen text-black font-serif">
      <div className=''>
      <Outlet />
      </div>
    </div>
  );
}