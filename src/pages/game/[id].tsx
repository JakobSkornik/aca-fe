import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useGameState } from '@/contexts/GameStateContext';
import { jobService } from '@/services/JobService';
import MainlineChessboard from '@/components/MainlineChessboard';
import PreviewChessboard from '@/components/PreviewChessboard';
import MoveList from '@/components/MoveList';
import Comments from '@/components/Comments';
import GameViewer from '@/components/GameViewer';

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
        if (gameJson.game_narrative == null) {
          manager.connectToJobCommentaryWs(id);
        }
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

  if (!state.isLoaded) {
    return <div className="flex items-center justify-center h-screen bg-light-gray text-darkest-gray">Initializing game state...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-light-gray p-4 gap-3 min-w-[1024px] overflow-x-auto">
      <h1 className="text-2xl font-bold darkest-gray text-center shrink-0">
        Automatic Chess Annotator
      </h1>

      {/* Row 1: main board | preview | game info (PVs, scores) */}
      <div className="flex flex-col xl:flex-row flex-shrink-0 bg-lightest-gray shadow-md rounded-md overflow-hidden min-h-[260px] max-h-[46vh] border border-gray-200">
        <div className="flex flex-row justify-center gap-4 xl:gap-6 flex-shrink-0 px-3 py-3 xl:py-4 xl:border-r border-gray-200">
          <div className="flex-none w-[min(22vw,320px)] min-w-[200px] max-w-[320px]">
            <MainlineChessboard />
          </div>
          <div className="flex-none w-[min(22vw,320px)] min-w-[200px] max-w-[320px]">
            <PreviewChessboard />
          </div>
        </div>
        <div className="flex-1 min-w-0 min-h-[200px] flex flex-col border-t xl:border-t-0 xl:border-l border-gray-200 overflow-hidden">
          <GameViewer />
        </div>
      </div>

      {/* Row 2: navigation (movelist) */}
      <div className="flex-shrink-0 h-[26vh] min-h-[200px] max-h-[340px] overflow-hidden border-t border-gray-200 pt-2">
        <MoveList />
      </div>

      {/* Row 3: commentary — fills remaining height */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-md border border-gray-200 bg-lightest-gray shadow-sm">
        <Comments />
      </div>
    </div>
  );
};

export default GamePage;
