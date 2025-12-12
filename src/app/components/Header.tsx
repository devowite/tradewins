'use client';

export default function Header({ user }: { user: any }) {
  return (
    <header className="flex justify-between items-center mb-10 border-b border-gray-700 pb-4">
      <h1 className="text-3xl font-bold text-blue-400">
        Sportex <span className="text-white text-lg font-normal">| Market MVP</span>
      </h1>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-gray-400">Balance</p>
          <p className="text-xl font-mono text-green-400 font-bold">
            ${user ? user.usd_balance.toFixed(2) : '---'}
          </p>
        </div>
        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white">
          {user ? user.username.charAt(0).toUpperCase() : '?'}
        </div>
      </div>
    </header>
  );
}