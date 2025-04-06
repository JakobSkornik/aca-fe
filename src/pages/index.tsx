import { useState } from 'react'
import ControlPanel from '../components/ControlPanel'
import ChessBoardSection from '../components/ChessBoardSection'

const AnnotatePGN = () => {
  const [hoveredArrow, setHoveredArrow] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-screen bg-gray-200 p-4">
      <h1 className="text-2xl font-bold mb-4 mx-auto text-center">Automatic Chess Annotator</h1>
      <div className="flex flex-row max-w-7xl mx-auto bg-white shadow-md rounded-md overflow-hidden">
        {/* Adjusted flex-basis and flex-grow for each section */}
        <div className="w-3/5">
          <ChessBoardSection hoveredArrow={hoveredArrow} />
        </div>
        <div className="w-2/5">
          <ControlPanel onArrowHover={setHoveredArrow} />
        </div>
      </div>
    </div>
  )
}

export default AnnotatePGN
