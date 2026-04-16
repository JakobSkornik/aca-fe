import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useGameState } from '@/contexts/GameStateContext';
import MainlineChessboard from '@/components/MainlineChessboard';
import PreviewChessboard from '@/components/PreviewChessboard';
import ControlPanel from '@/components/ControlPanel';
import MoveList from '@/components/MoveList';
import ModelForm from '@/components/ModelForm';

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
        <div className="flex-none w-[22vw] max-w-[360px]">
          <MainlineChessboard />
        </div>
        <div className="flex-none w-[22vw] max-w-[360px]">
          <PreviewChessboard />
        </div>
        <div className="flex-none max-w-[32vw] w-[32vw] min-w-[280px]">
          <ControlPanel />
        </div>
      </div>

      <div className="hidden xl:flex 2xl:hidden flex-row bg-lightest-gray justify-center shadow-md rounded-md overflow-hidden gap-4 relative z-10 h-[40vh] min-h-[260px] px-4">
        <div className="flex-none w-[280px]">
          <MainlineChessboard />
        </div>
        <div className="flex-none w-[280px]">
          <PreviewChessboard />
        </div>
        <div className="flex-1 min-w-[240px]">
          <ControlPanel />
        </div>
      </div>

      <div className="xl:hidden flex flex-col bg-lightest-gray shadow-md rounded-md overflow-hidden relative z-10 p-4 space-y-4">
        <div className="flex flex-row justify-center gap-6 flex-wrap">
          <div className="w-[260px]">
            <MainlineChessboard />
          </div>
          <div className="w-[260px]">
            <PreviewChessboard />
          </div>
        </div>
        <div className="h-[280px]">
          <ControlPanel />
        </div>
      </div>

      <div className="flex-shrink-0 h-[30vh] min-h-[220px] overflow-hidden z-index-100 pb-4">
        <div className="flex flex-row h-full w-full">
          <div className="w-[80%] h-full overflow-y-auto pr-2">
            <MoveList />
          </div>
          <div className="w-[20%] h-full border-l pl-2">
            <ModelForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalGamePage;
