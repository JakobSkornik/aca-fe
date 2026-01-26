import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useGameState } from '@/contexts/GameStateContext';
import { jobService } from '@/services/JobService';
import MainlineChessboard from '@/components/MainlineChessboard';
import PreviewChessboard from '@/components/PreviewChessboard';
import FeatureTable from '@/components/FeatureTable';
import ControlPanel from '@/components/ControlPanel';
import MoveList from '@/components/MoveList';
import ModelForm from '@/components/ModelForm';

const GamePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { manager, state } = useGameState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const loadGame = async () => {
      try {
        setLoading(true);
        const gameJson = await jobService.getGameJson(id);
        manager.loadGameFromJson(gameJson);
      } catch (e) {
        console.error(e);
        setError('Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [id, manager]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-light-gray text-darkest-gray">Loading game...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen bg-light-gray text-red-500">{error}</div>;
  }

  // Use state.isLoaded to prevent rendering empty components if something went wrong but no error caught
  if (!state.isLoaded) {
      return <div className="flex items-center justify-center h-screen bg-light-gray text-darkest-gray">Initializing game state...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-light-gray p-4 space-y-4 min-w-[1024px] overflow-x-auto">
      <h1 className="text-2xl font-bold darkest-gray text-center">
        Automatic Chess Annotator
      </h1>
      
      {/* Large screens (1920px and above) - Original layout */}
      <div className="hidden 2xl:flex flex-row bg-lightest-gray justify-between shadow-md rounded-md overflow-hidden space-x-4 relative z-10 h-[60vh]">
        <div className="flex-none max-w-[25vw] w-[25vw]">
          <MainlineChessboard />
        </div>
        <div className="flex-none max-w-[25vw] w-[25vw]">
          <PreviewChessboard />
        </div>
        <div className="flex-none max-w-[15vw] w-[15vw]">
          <FeatureTable />
        </div>
        <div className="flex-none max-w-[30vw] w-[30vw]">
          <ControlPanel />
        </div>
      </div>
      
      {/* Medium screens (below 1920px) - Reduced chessboard size */}
      <div className="hidden xl:flex 2xl:hidden flex-row bg-lightest-gray justify-between shadow-md rounded-md overflow-hidden space-x-4 relative z-10 h-[35vh]">
        <div className="flex-none w-[300px]">
          <MainlineChessboard />
        </div>
        <div className="flex-none w-[300px]">
          <PreviewChessboard />
        </div>
        <div className="flex-none max-w-[20vw] w-[20vw]">
          <FeatureTable />
        </div>
        <div className="flex-1">
          <ControlPanel />
        </div>
      </div>
      
      {/* Small screens (below 1280px) - Stacked layout */}
      <div className="xl:hidden flex flex-col bg-lightest-gray shadow-md rounded-md overflow-hidden space-y-4 relative z-10">
        {/* Top row: Chessboards */}
        <div className="flex flex-row justify-center space-x-4 p-4 h-[400px]">
          <div className="w-[300px]">
            <MainlineChessboard />
          </div>
          <div className="w-[300px]">
            <PreviewChessboard />
          </div>
        </div>
        
        {/* Bottom row: Feature table and game viewer */}
        <div className="flex flex-row space-x-4 p-4 h-[300px]">
          <div className="w-1/2">
            <FeatureTable />
          </div>
          <div className="w-1/2">
            <ControlPanel />
          </div>
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

export default GamePage;
