// Sources:
// - https://www.chessprogramming.org
// - https://hxim.github.io

export const materialDescription =
  'Non pawn material. Middlegame value of non-pawn material.'

export const mobilityDescription =
  'Mobility, a measure of the number of choices (legal moves) a player has in a given position. It is often used as a term in the evaluation function of chess programs. It is based on the idea that the more choices you have at your disposal, the stronger your position.'

export const imbalanceDescription =
  'Imbalance calculates the imbalance by comparing the piece count of each piece type for both colors. Evaluate the material imbalance. We use a place holder for the bishop pair "extended piece", which allows us to be more flexible in defining bishop pair bonuses.'

export const spaceDescription =
  'Space computes the space evaluation for a given side. The Space area bonus is multiplied by a weight: number of our pieces minus two times number of open files. The aim is to improve play on game opening.'

export const threatsDescription =
  "Middlegame threats bonus. Evaluates the amount of pieces that are attacking the opponent's pieces. The more pieces you have attacking your opponent's pieces, the stronger your position."

export const kingSafetyDescription =
  "The initial value is based on the number and types of the enemy's attacking pieces, the number of attacked and undefended squares around our king and the quality of the pawn shelter."

export const queensDescription =
  "Evaluates the queen's position and its influence on the board. The queen is a powerful piece, and its position can greatly affect the outcome of the game."

export const rooksDescription =
  "Evaluates the rooks' position and their influence on the board. Rooks are powerful pieces, especially when they are connected and can control open files."

export const knightsDescription =
  "Evaluates the knights' position and their influence on the board. Knights are unique pieces that can control squares that other pieces cannot, and their position can greatly affect the outcome of the game."

export const bishopsDescription =
  "Evaluates the bishops' position and their influence on the board. Bishops are long-range pieces that can control diagonals, and their position can greatly affect the outcome of the game."

export const passedPawnsDescription =
  'A passed pawn, also called free pawn or passer, is a pawn with no opponent pawns in front on the same or adjacent files.'
