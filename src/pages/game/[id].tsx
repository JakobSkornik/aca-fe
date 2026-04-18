import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useGameState } from '@/contexts/GameStateContext';
import { jobService } from '@/services/JobService';
import MainlineChessboard from '@/components/MainlineChessboard';
import GameSummaryPanel from '@/components/GameSummaryPanel';
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

      {/* Row 1: main board | game info (narrow) | game summary (wide) */}
      <div className="hidden 2xl:flex flex-shrink-0 flex-row bg-lightest-gray shadow-md rounded-md overflow-hidden min-h-[260px] max-h-[46vh] border border-gray-200">
        <div className="flex-none w-[32vw] max-w-[520px] shrink-0 border-r border-gray-200 px-3 py-4">
          <MainlineChessboard />
        </div>
        <div className="flex-none w-[22vw] max-w-[360px] shrink-0 border-r border-gray-200 px-2 py-3">
          <GameViewer />
        </div>
        <div className="min-h-[200px] min-w-0 flex-1 flex flex-col overflow-hidden px-2 py-3">
          <GameSummaryPanel />
        </div>
      </div>

      <div className="hidden xl:flex 2xl:hidden flex-shrink-0 flex-row bg-lightest-gray shadow-md rounded-md overflow-hidden min-h-[260px] max-h-[46vh] border border-gray-200">
        <div className="flex-none w-[360px] shrink-0 border-r border-gray-200 px-3 py-4">
          <MainlineChessboard />
        </div>
        <div className="flex-none w-[260px] min-w-[220px] shrink-0 border-r border-gray-200 px-2 py-3">
          <GameViewer />
        </div>
        <div className="min-h-[200px] min-w-0 flex-1 flex flex-col overflow-hidden px-2 py-3">
          <GameSummaryPanel />
        </div>
      </div>

      <div className="xl:hidden flex flex-shrink-0 flex-col bg-lightest-gray shadow-md rounded-md overflow-hidden min-h-[260px] max-h-[46vh] border border-gray-200">
        <div className="flex flex-row justify-center border-b border-gray-200 px-3 py-3">
          <div className="w-[360px] mx-auto">
            <MainlineChessboard />
          </div>
        </div>
        <div className="min-h-[180px] min-w-0 border-b border-gray-200 px-2 py-2">
          <GameViewer />
        </div>
        <div className="min-h-[200px] min-w-0 flex flex-col overflow-hidden px-2 py-2">
          <GameSummaryPanel />
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
