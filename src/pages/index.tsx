import React from 'react';
import { useRouter } from 'next/router';
import JobSubmission from '@/components/JobSubmission';
import { useGameState } from '@/contexts/GameStateContext';

const Home = () => {
  const router = useRouter();
  const { manager } = useGameState();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        manager.loadGameFromJson(json);
        router.push('/game/local'); 
      } catch (err) {
        console.error(err);
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-light-gray flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-darkest-gray">
            Automatic Chess Annotator
          </h2>
        </div>

        <div className="bg-lightest-gray py-8 px-4 shadow rounded-lg sm:px-10">
          <JobSubmission />
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-gray"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-lightest-gray text-dark-gray">
                  Or load existing analysis
                </span>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-darkest-gray">
                Load JSON File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="mt-1 block w-full text-sm text-dark-gray
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-light-gray file:text-darkest-gray
                  hover:file:bg-dark-gray"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
