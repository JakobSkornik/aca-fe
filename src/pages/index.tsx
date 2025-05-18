import { useState } from 'react'
import ControlPanel from '../components/ControlPanel'
import ChessBoardSection from '../components/ChessBoardSection'
import FeatureCharts from '../components/FeatureCharts'


const AnnotatePGN = () => {
  const [hoveredArrow, setHoveredArrow] = useState<string | null>(null)
  const [showFeatures, setShowFeatures] = useState(false)

  return (
    <div className="flex flex-col h-screen bg-light-gray p-4">
      <h1 className="text-2xl font-bold mb-4 mx-auto darkest-gray text-center">
        Automatic Chess Annotator
      </h1>
      <div className="flex flex-row mx-auto bg-lightest-gray shadow-md rounded-md overflow-hidden">
        <div>
          <ChessBoardSection hoveredArrow={hoveredArrow} />
        </div>
        <div>
          <ControlPanel
            onArrowHover={setHoveredArrow}
            showFeatures={showFeatures}
            setShowFeatures={setShowFeatures}
          />
        </div>
        {showFeatures && <FeatureCharts />}
      </div>
    </div>
  )
}

export default AnnotatePGN
