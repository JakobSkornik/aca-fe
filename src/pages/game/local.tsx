import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useGameState } from '@/contexts/GameStateContext';
import MainlineChessboard from '@/components/MainlineChessboard';
import GameSummaryPanel from '@/components/GameSummaryPanel';
import ControlPanel from '@/components/ControlPanel';
import MoveList from '@/components/MoveList';

const LocalGamePage = () => {
  const { state } = useGameState();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoaded) {
      router.push('/');
    }
  }, [state.isLoaded, router]);

  if (!state.isLoaded) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-light-gray p-4 space-y-4 min-w-[1024px] overflow-x-auto">
      <h1 className="text-2xl font-bold darkest-gray text-center">
        Automatic Chess Annotator
      </h1>

      <div className="hidden 2xl:flex flex-row bg-lightest-gray justify-center shadow-md rounded-md overflow-hidden gap-6 relative z-10 h-[50vh] min-h-[280px] px-4">
        <div className="flex-none w-[32vw] max-w-[520px]">
          <MainlineChessboard />
        </div>
        <div className="flex-none w-[22vw] max-w-[360px]">
          <ControlPanel />
        </div>
        <div className="flex-none max-w-[32vw] w-[32vw] min-w-[280px]">
          <GameSummaryPanel />
        </div>
      </div>

      <div className="hidden xl:flex 2xl:hidden flex-row bg-lightest-gray justify-center shadow-md rounded-md overflow-hidden gap-4 relative z-10 h-[40vh] min-h-[260px] px-4">
        <div className="flex-none w-[360px]">
          <MainlineChessboard />
        </div>
        <div className="flex-none w-[260px] min-w-[220px] shrink-0">
          <ControlPanel />
        </div>
        <div className="min-w-0 flex-1">
          <GameSummaryPanel />
        </div>
      </div>

      <div className="xl:hidden flex flex-col bg-lightest-gray shadow-md rounded-md overflow-hidden relative z-10 p-4 space-y-4">
        <div className="flex flex-row justify-center">
          <div className="w-[360px] mx-auto">
            <MainlineChessboard />
          </div>
        </div>
        <div className="h-[280px] w-full min-w-0">
          <ControlPanel />
        </div>
        <div className="w-full min-w-0">
          <GameSummaryPanel />
        </div>
      </div>

      <div className="flex-shrink-0 h-[30vh] min-h-[220px] overflow-hidden z-index-100 pb-4">
        <div className="h-full w-full overflow-y-auto">
          <MoveList />
        </div>
      </div>
    </div>
  );
};

export default LocalGamePage;
