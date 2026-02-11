// ─── Chess Academy — Types ─────────────────────────────────────────────────

export interface AcademyStep {
  move?: string;
  title: string;
  explanation: string;
  arrows?: { from: string; to: string }[];
  highlights?: string[];
  fen?: string;
}

export interface AcademyLesson {
  id: string;
  name: string;
  description: string;
  steps: AcademyStep[];
}

export interface AcademyCourse {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'master';
  ratingRange: string;
  certificate: { name: string; icon: string };
  lessons: AcademyLesson[];
}

// ─── Course 1: Chess Fundamentals (15 lessons) ────────────────────────────

const fundamentals: AcademyCourse = {
  id: 'fundamentals',
  name: 'Chess Fundamentals',
  description: 'Learn the rules, piece movement, and basic principles of chess.',
  icon: '\u{1F393}',
  color: '#22c55e',
  level: 'beginner',
  ratingRange: '0-600',
  certificate: { name: 'Chess Fundamentals', icon: '\u{1F393}' },
  lessons: [
    {
      id: 'chessboard',
      name: 'The Chessboard: Files, Ranks, Diagonals',
      description: 'Understand the 64-square battlefield.',
      steps: [
        { title: 'The Chessboard', explanation: 'Chess is played on an 8x8 board with 64 squares alternating light and dark. The board is always set up with a light square in the bottom-right corner.' },
        { title: 'Files', explanation: 'The vertical columns are called files, labeled a through h from left to right (from White\'s perspective). You\'ll use these letters in chess notation.', highlights: ['a1','a2','a3','a4','a5','a6','a7','a8'] },
        { title: 'Ranks', explanation: 'The horizontal rows are called ranks, numbered 1 through 8 from bottom to top. White\'s pieces start on ranks 1-2, Black\'s on ranks 7-8.', highlights: ['a1','b1','c1','d1','e1','f1','g1','h1'] },
        { title: 'Diagonals', explanation: 'Lines of squares running corner to corner are diagonals. Bishops move along diagonals. The longest diagonals (a1-h8, a8-h1) have 8 squares each.', arrows: [{ from: 'a1', to: 'h8' }] },
        { title: 'Square Names', explanation: 'Every square has a unique name: file letter + rank number. For example, e4 is the square on the e-file and 4th rank. This is how we write chess moves!', highlights: ['e4'] },
      ],
    },
    {
      id: 'pieces-krq',
      name: 'Piece Movement: King, Queen, Rook',
      description: 'How the three major pieces move.',
      steps: [
        { title: 'The Rook', explanation: 'Rooks move in straight lines \u2014 horizontally or vertically \u2014 any number of squares. They cannot jump over pieces. Rooks start in the corners (a1, h1, a8, h8).', highlights: ['a1', 'h1'], arrows: [{ from: 'a1', to: 'a8' }, { from: 'a1', to: 'h1' }] },
        { title: 'The Queen', explanation: 'The Queen is the most powerful piece. She combines the Rook and Bishop \u2014 moving any number of squares in any direction (horizontal, vertical, or diagonal). Worth about 9 pawns!', highlights: ['d1'], arrows: [{ from: 'd1', to: 'd8' }, { from: 'd1', to: 'h5' }] },
        { title: 'The King', explanation: 'The King moves exactly one square in any direction. He\'s not powerful in attack, but he\'s the most important piece \u2014 if he\'s checkmated, you lose!', highlights: ['e1'] },
        { title: 'Protecting the King', explanation: 'Because losing the King means losing the game, keep him safe! In the opening, castle to tuck him behind pawns. In the endgame, the King becomes an active fighting piece.' },
      ],
    },
    {
      id: 'pieces-bnp',
      name: 'Piece Movement: Bishop, Knight, Pawn',
      description: 'How the minor pieces and pawns move.',
      steps: [
        { title: 'The Bishop', explanation: 'Bishops move diagonally any number of squares. Each bishop stays on one color for the entire game \u2014 you start with one light-squared and one dark-squared bishop.', highlights: ['c1', 'f1'], arrows: [{ from: 'c1', to: 'h6' }] },
        { title: 'The Knight', explanation: 'Knights move in an L-shape: two squares in one direction, then one square perpendicular. Knights are the ONLY piece that can jump over other pieces!', highlights: ['b1', 'g1'], arrows: [{ from: 'g1', to: 'f3' }] },
        { title: 'The Pawn', explanation: 'Pawns move forward one square, but capture diagonally forward. On their first move, they can advance two squares. Pawns never move backward!', highlights: ['e2'], arrows: [{ from: 'e2', to: 'e4' }] },
        { title: 'Pawn Promotion', explanation: 'When a pawn reaches the opposite end of the board (rank 8 for White, rank 1 for Black), it promotes to any piece \u2014 usually a Queen. This makes passed pawns extremely valuable in endgames!' },
      ],
    },
    {
      id: 'piece-values',
      name: 'Piece Values and Trading',
      description: 'Learn the relative value of each piece.',
      steps: [
        { title: 'Piece Values', explanation: 'Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9, King = priceless. These values help you evaluate trades \u2014 trading a Bishop (3) for a Rook (5) is a good deal!' },
        { title: 'Good Trades', explanation: 'Winning material means capturing pieces worth more than what you give up. Trading a Knight (3) for a Rook (5) wins 2 points of material. This is called "winning the exchange."' },
        { title: 'Bad Trades', explanation: 'Giving up a Queen (9) for a Rook (5) loses 4 points \u2014 a bad trade. Always count the material before making captures. Sometimes beginners overlook that their piece is also hanging!' },
        { title: 'When to Trade', explanation: 'Trade pieces when you\'re ahead in material \u2014 it simplifies the position and makes your advantage bigger. Avoid trades when you\'re behind; keep pieces on to create complications.' },
      ],
    },
    {
      id: 'castling',
      name: 'Special Moves: Castling',
      description: 'The most important special move in chess.',
      steps: [
        { title: 'What Is Castling?', explanation: 'Castling moves the King two squares toward a Rook, and the Rook jumps to the other side of the King. It\'s the only move where two pieces move at once!', arrows: [{ from: 'e1', to: 'g1' }, { from: 'h1', to: 'f1' }] },
        { title: 'Kingside Castling (O-O)', explanation: 'Castling with the h-Rook is called kingside castling or "castling short." The King goes to g1, the Rook to f1. This is the most common form.', arrows: [{ from: 'e1', to: 'g1' }] },
        { title: 'Queenside Castling (O-O-O)', explanation: 'Castling with the a-Rook is queenside castling or "castling long." The King goes to c1, the Rook to d1. This takes more preparation since there are 3 squares to clear.', arrows: [{ from: 'e1', to: 'c1' }] },
        { title: 'Castling Rules', explanation: 'You CANNOT castle if: (1) the King or Rook has already moved, (2) the King is in check, (3) the King passes through or lands on an attacked square, (4) there are pieces between them.' },
        { title: 'Why Castle?', explanation: 'Castling does two great things at once: it gets your King to safety behind pawns, and it activates your Rook toward the center. Always try to castle early in the game!' },
      ],
    },
    {
      id: 'en-passant-promotion',
      name: 'Special Moves: En Passant & Promotion',
      description: 'Two more special pawn moves to know.',
      steps: [
        { title: 'En Passant', explanation: 'When a pawn advances two squares from its starting position and lands beside an enemy pawn, the enemy pawn can capture it "in passing" \u2014 as if it had only moved one square. This must be done immediately on the next move or the right is lost.', fen: 'rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3', arrows: [{ from: 'f5', to: 'e6' }], highlights: ['e5', 'f5'] },
        { title: 'En Passant Example', explanation: 'Here White\'s pawn on f5 can capture Black\'s e5 pawn en passant, moving to e6. The Black pawn on e5 is removed. This special capture prevents pawns from "sneaking past" by advancing two squares.' },
        { title: 'Pawn Promotion', explanation: 'When a pawn reaches the last rank, it MUST promote to a Queen, Rook, Bishop, or Knight. You almost always choose Queen since it\'s the strongest piece.', fen: '8/4P3/8/8/8/8/8/4K2k w - - 0 1', highlights: ['e7'] },
        { title: 'Underpromotion', explanation: 'Sometimes promoting to a Knight is better than a Queen! A Knight can deliver checkmate in positions where a Queen can\'t. Promoting to a Rook or Bishop is rare but can avoid stalemate.' },
      ],
    },
    {
      id: 'check-checkmate-stalemate',
      name: 'Check, Checkmate, and Stalemate',
      description: 'The three most important concepts in chess.',
      steps: [
        { title: 'Check', explanation: 'When a piece attacks the enemy King, that\'s check. The player in check MUST deal with it \u2014 by moving the King, blocking the attack, or capturing the attacker. You cannot ignore check!' },
        { title: 'Checkmate', explanation: 'Checkmate means the King is in check and there is NO way to escape. The game is over \u2014 the player who delivers checkmate wins! This is the ultimate goal of chess.', fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', arrows: [{ from: 'e1', to: 'e8' }] },
        { title: 'Stalemate', explanation: 'Stalemate occurs when a player is NOT in check but has NO legal moves. The game is a draw! This is a common trap \u2014 if you\'re winning, be careful not to stalemate your opponent.', fen: 'k7/8/1K6/8/8/8/8/1Q6 w - - 0 1' },
        { title: 'Avoiding Stalemate', explanation: 'When you\'re ahead in material, always check that your opponent has a legal move. Common stalemate patterns: King stuck in corner with no squares, all pawns blocked. Give your opponent "breathing room" while keeping your winning advantage.' },
      ],
    },
    {
      id: 'notation',
      name: 'Reading Chess Notation',
      description: 'How to read and write chess moves.',
      steps: [
        { title: 'Algebraic Notation', explanation: 'Chess uses algebraic notation to record moves. Each piece has a letter: K=King, Q=Queen, R=Rook, B=Bishop, N=Knight. Pawns have no letter. A move is the piece letter + destination square.' },
        { title: 'Examples', explanation: 'e4 = pawn to e4. Nf3 = Knight to f3. Bc4 = Bishop to c4. O-O = kingside castling. O-O-O = queenside castling. Captures use "x": Bxf7 = Bishop captures on f7.' },
        { title: 'Special Symbols', explanation: '+ means check. # means checkmate. ! means a good move. ? means a mistake. !! means brilliant. ?? means a blunder. These help annotate games.' },
        { title: 'Why Learn Notation?', explanation: 'Notation lets you study famous games, follow chess books, and review your own games. All serious chess training uses notation. It becomes second nature with practice!' },
      ],
    },
    {
      id: 'mate-qk',
      name: 'Checkmate: Queen + King vs King',
      description: 'The most basic checkmate pattern.',
      steps: [
        { title: 'Queen + King vs King', explanation: 'This is the most fundamental checkmate every player must know. The idea: use your Queen to restrict the enemy King to the edge of the board, then bring your King close to deliver checkmate.', fen: '8/8/8/4k3/8/8/8/4QK2 w - - 0 1' },
        { title: 'Step 1: Restrict', explanation: 'Use the Queen to cut off ranks or files, pushing the enemy King toward the edge. The Queen alone can restrict the King to a smaller and smaller area.', fen: '8/8/8/4k3/8/8/4Q3/5K2 w - - 0 1', arrows: [{ from: 'e2', to: 'e7' }] },
        { title: 'Step 2: Bring the King', explanation: 'Your King must help deliver checkmate. Walk your King toward the enemy King. The Queen restricts while the King approaches.', fen: '8/8/8/4k3/8/4K3/4Q3/8 w - - 0 1' },
        { title: 'Step 3: Checkmate!', explanation: 'Once the enemy King is on the edge and your King is close, deliver checkmate. Typical patterns: Queen on the 7th rank with King on the 6th, or Queen directly next to the cornered King supported by your King.', fen: '4k3/4Q3/4K3/8/8/8/8/8 b - - 0 1' },
        { title: 'Avoid Stalemate!', explanation: 'The biggest danger in Q+K vs K is stalemate! When the enemy King is in the corner, don\'t give check that leaves no legal moves. Always ensure the King has at least one square (until you deliver mate).' },
      ],
    },
    {
      id: 'mate-rk',
      name: 'Checkmate: Rook + King vs King',
      description: 'An essential endgame technique.',
      steps: [
        { title: 'Rook + King vs King', explanation: 'Slightly harder than Q+K, but every chess player must master this. The technique is called "building a box" \u2014 using the Rook to cut off the King, then using your King to shrink the box.', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1' },
        { title: 'Building the Box', explanation: 'Place your Rook on a rank or file to create a barrier the enemy King cannot cross. The King is trapped in a "box." Then bring your King to make the box smaller.', fen: '8/8/8/4k3/R7/8/8/4K3 w - - 0 1', arrows: [{ from: 'a4', to: 'h4' }] },
        { title: 'Shrinking the Box', explanation: 'Walk your King up while keeping the Rook barrier in place. When the enemy King approaches the Rook, move the Rook to the other side of the board and continue shrinking.', fen: '8/8/4k3/8/R7/4K3/8/8 w - - 0 1' },
        { title: 'Opposition', explanation: 'Place your King directly opposite the enemy King with one rank between them \u2014 this is "opposition." The enemy King must retreat, and then your Rook delivers the final rank check.', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1' },
        { title: 'Checkmate!', explanation: 'With opposition and the King on the edge, the Rook checks on the back rank for checkmate. Practice this until you can do it confidently!', fen: 'R3k3/8/4K3/8/8/8/8/8 b - - 0 1' },
      ],
    },
    {
      id: 'opening-center',
      name: 'Opening Principles: Control the Center',
      description: 'Why the center squares matter.',
      steps: [
        { title: 'The Center', explanation: 'The four center squares (e4, d4, e5, d5) are the most important squares on the board. Pieces in the center control more squares and can reach both sides quickly.', highlights: ['e4', 'd4', 'e5', 'd5'] },
        { title: 'Pawns in the Center', explanation: 'Placing pawns on e4 and d4 gives White a strong center. These pawns control key squares and support piece development. Openings like 1.e4 and 1.d4 follow this principle.', arrows: [{ from: 'e2', to: 'e4' }, { from: 'd2', to: 'd4' }] },
        { title: 'Piece Control', explanation: 'Even without pawns in the center, you can control it with pieces. Knights on f3/c3 and bishops aimed at the center provide control. The idea is influence, not just occupation.' },
        { title: 'What Happens Without Center Control', explanation: 'If you ignore the center, your opponent claims it with pawns and pieces, leaving your pieces cramped on the back ranks with little mobility. Fight for the center from move one!' },
      ],
    },
    {
      id: 'opening-develop',
      name: 'Opening Principles: Develop Your Pieces',
      description: 'Get your army into the fight quickly.',
      steps: [
        { title: 'What Is Development?', explanation: 'Development means moving your pieces from their starting squares to active positions. In the opening, your goal is to get all your minor pieces (knights and bishops) out quickly.' },
        { title: 'Knights Before Bishops', explanation: 'Knights usually develop before bishops because their best squares (f3, c3, f6, c6) are clear early. Bishops need to see open diagonals, which often requires pawns to move first.' },
        { title: 'Don\'t Move the Same Piece Twice', explanation: 'In the opening, every tempo (move) counts. Moving the same piece twice means another piece stays home. Exception: if you can win material or avoid a major threat.' },
        { title: 'Don\'t Bring the Queen Out Early', explanation: 'The Queen is valuable and can be chased by minor pieces, losing tempo. Develop knights and bishops first, castle, then bring the Queen to an active square.' },
      ],
    },
    {
      id: 'opening-castle',
      name: 'Opening Principles: Castle Early',
      description: 'King safety is priority number one.',
      steps: [
        { title: 'Why Castle Early?', explanation: 'Castling gets your King to safety behind a wall of pawns and connects your Rooks. An uncastled King in the center is a target \u2014 many tactics exploit this.' },
        { title: 'Kingside vs Queenside', explanation: 'Kingside castling (O-O) is faster (only 2 pieces to move out) and usually safer. Queenside castling (O-O-O) takes more setup but can be aggressive, putting the Rook on the d-file.' },
        { title: 'Don\'t Delay Too Long', explanation: 'If you delay castling, your opponent may open the center with a pawn break (like d4 or e4), exposing your King. Try to castle within the first 10 moves.' },
        { title: 'When NOT to Castle', explanation: 'Rarely, castling can be bad: if the opponent has a strong attack aimed at your castled King\'s side, or if the center is completely locked and your King is safe there.' },
      ],
    },
    {
      id: 'beginner-mistakes',
      name: 'Common Beginner Mistakes & Traps',
      description: 'Avoid the most common pitfalls.',
      steps: [
        { title: 'Scholar\'s Mate', explanation: 'The 4-move checkmate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#. It targets f7. Defense: don\'t panic! 3...g6 or 3...Qe7 stops it easily. Know this pattern to avoid it.', fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4' },
        { title: 'Hanging Pieces', explanation: 'A "hanging" piece is undefended and can be captured for free. Before every move, scan the board: are any of my pieces undefended? Can my opponent capture something? This simple check prevents most blunders.' },
        { title: 'Moving Without Purpose', explanation: 'Every move should have a reason: develop a piece, control the center, create a threat, or defend. Random moves waste time and give your opponent the initiative.' },
        { title: 'Ignoring Opponent\'s Threats', explanation: 'Always ask: "What is my opponent threatening?" before making your move. Chess is a conversation \u2014 you need to respond to your opponent\'s ideas, not just execute your own plan.' },
      ],
    },
    {
      id: 'putting-together',
      name: 'Putting It Together',
      description: 'Apply all fundamental principles in a sample game.',
      steps: [
        { title: 'A Model Opening', explanation: 'Let\'s see all the principles in action. We\'ll play the first few moves of a well-played game, applying: center control, development, and castling.' },
        { move: 'e4', title: '1. e4', explanation: 'Control the center with a pawn. Opens lines for the bishop and queen.', arrows: [{ from: 'e2', to: 'e4' }] },
        { move: 'e5', title: '1...e5', explanation: 'Black fights for the center symmetrically.' },
        { move: 'Nf3', title: '2. Nf3', explanation: 'Develop a knight toward the center. It attacks e5 and controls d4.', arrows: [{ from: 'g1', to: 'f3' }] },
        { move: 'Nc6', title: '2...Nc6', explanation: 'Develop and defend e5. Good development!' },
        { move: 'Bc4', title: '3. Bc4', explanation: 'Develop the bishop to an active diagonal, eyeing f7.', arrows: [{ from: 'f1', to: 'c4' }] },
        { move: 'Bc5', title: '3...Bc5', explanation: 'Black develops actively too, eyeing f2.' },
        { move: 'O-O', title: '4. O-O', explanation: 'Castle! King is safe, rook is activated. All three opening principles are fulfilled in just 4 moves: center control, development, and castling.' },
        { title: 'Congratulations!', explanation: 'You\'ve learned all the fundamentals of chess! You know how pieces move, piece values, special moves, notation, basic checkmates, and opening principles. Now practice these concepts and move on to Basic Tactics!' },
      ],
    },
  ],
};

// ─── Course 2: Basic Tactics (14 lessons) ─────────────────────────────────

const basicTactics: AcademyCourse = {
  id: 'basic-tactics',
  name: 'Basic Tactics',
  description: 'Master the essential tactical patterns every chess player must know.',
  icon: '\u26A1',
  color: '#eab308',
  level: 'beginner',
  ratingRange: '600-900',
  certificate: { name: 'Tactician', icon: '\u26A1' },
  lessons: [
    {
      id: 'what-are-tactics',
      name: 'What Are Tactics? Forcing Moves',
      description: 'The foundation of tactical chess.',
      steps: [
        { title: 'Tactics vs Strategy', explanation: 'Strategy is your long-term plan. Tactics are short-term sequences (2-5 moves) that win material or deliver checkmate. Even the best strategy fails without tactical skill!' },
        { title: 'Forcing Moves', explanation: 'The key to tactics: checks, captures, and threats. These are "forcing" because your opponent must respond to them. By chaining forcing moves, you control the game.' },
        { title: 'Think in Order', explanation: 'When looking for tactics, check forcing moves in this order: (1) Checks \u2014 the most forcing, (2) Captures \u2014 must be considered, (3) Threats \u2014 create problems. This "Checks, Captures, Threats" method finds most tactics.' },
        { title: 'Practice Thinking', explanation: 'Before every move, ask: "Do I have a check? A capture that wins material? A threat my opponent can\'t handle?" This habit will dramatically improve your game.' },
      ],
    },
    {
      id: 'fork',
      name: 'The Fork: One Piece, Two Targets',
      description: 'Attack two things at once.',
      steps: [
        { title: 'What Is a Fork?', explanation: 'A fork attacks two (or more) pieces simultaneously. The opponent can only save one, so you win the other. Any piece can fork, but Knights and Queens are the most common forking pieces.' },
        { title: 'Queen Fork', explanation: 'The Queen can fork from many angles since she moves in all directions. Here the Queen attacks both the Rook and Bishop at once.', fen: '2k5/8/2r3b1/8/4Q3/8/8/4K3 w - - 0 1', highlights: ['c6', 'g6', 'e4'] },
        { title: 'Pawn Fork', explanation: 'Even the humble pawn can fork! A pawn attacking two pieces diagonally is devastating because the pawn is worth so little.', fen: '2k5/8/2n1b3/3P4/8/8/8/4K3 w - - 0 1', highlights: ['c6', 'e6', 'd5'] },
        { title: 'Setting Up Forks', explanation: 'Forks don\'t appear by magic. Look for positions where two enemy pieces are on squares that one of your pieces can attack simultaneously. Sometimes you need a preliminary move to set up the fork.' },
      ],
    },
    {
      id: 'knight-fork',
      name: 'The Knight Fork',
      description: 'The knight is the ultimate forking piece.',
      steps: [
        { title: 'Why Knights Fork So Well', explanation: 'Knights move in L-shapes, attacking squares that other pieces don\'t cover. A Knight fork is hard to see coming and impossible to block (since Knights jump). It\'s the most common tactical pattern!' },
        { title: 'Royal Fork', explanation: 'The most devastating fork: a Knight attacks both the King and Queen! The King must move, and the Queen is lost.', fen: '3q1k2/8/4N3/8/8/8/8/4K3 w - - 0 1', highlights: ['d8', 'f8', 'e6'] },
        { title: 'Family Fork', explanation: 'A Knight forking King, Queen, AND Rook is called a "family fork." It\'s spectacularly destructive and one of the most satisfying patterns in chess.', fen: '8/3k1r2/2q5/4N3/8/8/8/4K3 w - - 0 1', highlights: ['d7', 'c6', 'f7', 'e5'] },
        { title: 'Spotting Knight Forks', explanation: 'Look for enemy pieces on the same color square (Knights always land on the opposite color from where they start). If the King and Queen are both on light squares, a Knight on a dark square might fork them!' },
      ],
    },
    {
      id: 'pin',
      name: 'The Pin: Absolute and Relative',
      description: 'Immobilize enemy pieces with pins.',
      steps: [
        { title: 'What Is a Pin?', explanation: 'A pin attacks a piece that cannot (or should not) move because it would expose a more valuable piece behind it. The pinned piece is stuck! Only Bishops, Rooks, and Queens can pin.' },
        { title: 'Absolute Pin', explanation: 'An absolute pin is against the King: the pinned piece CANNOT legally move because it would leave the King in check. This is the strongest type of pin.', fen: 'r1bqkb1r/ppp1pppp/2n2n2/1B1p4/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 3', arrows: [{ from: 'b5', to: 'e8' }], highlights: ['c6'] },
        { title: 'Relative Pin', explanation: 'A relative pin is against a valuable piece (like the Queen). The pinned piece CAN legally move, but doing so loses material. It\'s a strong positional weapon.', fen: 'rnbqkb1r/pppp1ppp/5n2/4p1B1/4P3/8/PPPP1PPP/RN1QKBNR b KQkq - 0 2', arrows: [{ from: 'g5', to: 'd8' }], highlights: ['f6'] },
        { title: 'Exploiting Pins', explanation: 'A pinned piece is a target! Pile up pressure on the pinned piece with pawns and other pieces. Since it can\'t move, it\'s like attacking a piece that can\'t run away.' },
      ],
    },
    {
      id: 'skewer',
      name: 'The Skewer',
      description: 'The reverse of a pin.',
      steps: [
        { title: 'What Is a Skewer?', explanation: 'A skewer is the opposite of a pin: you attack a valuable piece, and when it moves, you capture a piece behind it. The more valuable piece is in FRONT (in a pin, it\'s in back).' },
        { title: 'King Skewer', explanation: 'The most common skewer: a Rook checks the King, and when the King moves, captures the Queen behind it.', fen: '4q3/8/8/8/4k3/8/8/4R1K1 b - - 0 1', arrows: [{ from: 'e1', to: 'e8' }], highlights: ['e4', 'e8'] },
        { title: 'Queen Skewer', explanation: 'Skewering through the Queen to a Rook is also common. The Queen must move, and the Rook behind her is captured.', fen: '6k1/6r1/8/8/3q4/8/8/B3K3 w - - 0 1', arrows: [{ from: 'a1', to: 'g7' }], highlights: ['d4', 'g7'] },
        { title: 'Avoiding Skewers', explanation: 'Don\'t place your King and Queen on the same rank, file, or diagonal! If you must, ensure the line is blocked. Be aware of long diagonal and file threats.' },
      ],
    },
    {
      id: 'discovered-attack',
      name: 'Discovered Attacks',
      description: 'Two threats in one move.',
      steps: [
        { title: 'What Is a Discovered Attack?', explanation: 'A discovered attack happens when you move one piece and reveal an attack from a piece behind it. It\'s like a double threat: the piece you moved creates one threat, the uncovered piece creates another.' },
        { title: 'Discovered Check', explanation: 'The most powerful discovered attack is a discovered check \u2014 the uncovered piece gives check. While the opponent deals with check, your moved piece can capture anything!', fen: '4k3/1q6/8/8/4N3/8/8/4RK2 w - - 0 1', arrows: [{ from: 'e4', to: 'c5' }] },
        { title: 'Discovered Attack Example', explanation: 'The Knight moves to attack the Queen, simultaneously uncovering a Rook attack on the King. The opponent must deal with check, so you win the Queen for free!' },
        { title: 'Creating Discovered Attacks', explanation: 'Line up your pieces with a gap: Bishop behind Knight on the same diagonal, or Rook behind Knight/Bishop on the same file. Then look for a powerful move with the front piece.' },
      ],
    },
    {
      id: 'double-check',
      name: 'Double Check',
      description: 'The most forcing move in chess.',
      steps: [
        { title: 'What Is Double Check?', explanation: 'Double check is the ultimate forcing move: BOTH the moved piece and the uncovered piece give check simultaneously. The only defense is to move the King \u2014 you can\'t block or capture two pieces at once!' },
        { title: 'Why Double Check Is Deadly', explanation: 'Because only King moves are legal, you can often force the King into a terrible position. Many brilliant combinations end with double check leading to checkmate.', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5' },
        { title: 'Double Check Mate', explanation: 'Some checkmates are only possible with double check, because the King has no escape. The two checking pieces cover all the escape squares together.' },
        { title: 'Look for Double Check', explanation: 'Whenever you have a piece battery (two pieces lined up), think about whether moving the front piece could give double check. These positions create the most spectacular combinations!' },
      ],
    },
    {
      id: 'back-rank',
      name: 'Back Rank Mate',
      description: 'A devastating pattern against weak back ranks.',
      steps: [
        { title: 'The Back Rank', explanation: 'The back rank (1st rank for White, 8th for Black) is where the King hides after castling. If the King is trapped by its own pawns with no escape square, a Rook or Queen can deliver mate on the back rank!', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', arrows: [{ from: 'd1', to: 'd8' }] },
        { title: 'Back Rank Mate Pattern', explanation: 'A Rook or Queen slides to the 8th rank, and the King is trapped behind its own g, f, and h pawns. No escape, no block, no capture \u2014 checkmate!', fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1' },
        { title: 'Creating Luft', explanation: '"Luft" means air \u2014 an escape square for the King. Pushing h3 (or h6 for Black) creates luft and prevents back rank mates. This small prophylactic move can save your life!' },
        { title: 'Exploiting Weak Back Ranks', explanation: 'Before tactical shots, check if your opponent\'s back rank is weak. Sometimes a sacrifice clears the way: e.g., sacrifice a piece to deflect a defender, then deliver back rank mate.' },
      ],
    },
    {
      id: 'decoy-deflection',
      name: 'Decoy and Deflection',
      description: 'Lure enemy pieces away from their duties.',
      steps: [
        { title: 'Deflection', explanation: 'Deflection forces a defending piece away from what it\'s guarding. If a Rook defends the back rank and you attack it, it must move \u2014 leaving the back rank undefended!' },
        { title: 'Decoy', explanation: 'A decoy lures an enemy piece to a bad square. Here Qd7+! forces Kxd7, then Nb6+ forks King and Rook.', fen: 'r2k4/8/8/8/8/2N5/3Q4/4K3 w - - 0 1', arrows: [{ from: 'd2', to: 'd7' }] },
        { title: 'Sacrifice to Deflect', explanation: 'Deflections often involve sacrifices: give up material to pull a key defender away. The temporary material loss is recovered (and more) by the tactic that follows.' },
        { title: 'Key Idea', explanation: 'Always ask: "What is this piece defending? Can I force it away?" If a piece has two jobs (defending two things), it might be overloaded and vulnerable to deflection.' },
      ],
    },
    {
      id: 'removal-guard',
      name: 'Removal of the Guard',
      description: 'Eliminate the defender, then strike.',
      steps: [
        { title: 'What Is Removal of the Guard?', explanation: 'If a piece defends something important, simply capture that defender! Once the guard is removed, the thing it was defending is vulnerable. This is one of the most practical tactical patterns.' },
        { title: 'Example', explanation: 'The Knight on f5 defends the Rook on e7. Bxf5 captures the Knight, removing the guard. Now the Rook is hanging and Rxe7+ wins it!', fen: '4k3/4r3/8/5n2/8/3B4/8/4RK2 w - - 0 1', arrows: [{ from: 'd3', to: 'f5' }], highlights: ['e7', 'f5'] },
        { title: 'Guarding Chains', explanation: 'Sometimes pieces protect each other in a chain. Find the piece at the base of the chain and remove it \u2014 the whole structure collapses. This is especially common with pawn chains.' },
        { title: 'Combined Patterns', explanation: 'Removal of the guard often combines with other tactics. Remove a defender, then fork the undefended pieces. Or remove a back rank defender, then deliver checkmate.' },
      ],
    },
    {
      id: 'overloading',
      name: 'Overloading Defenders',
      description: 'When one piece has too many jobs.',
      steps: [
        { title: 'What Is Overloading?', explanation: 'A piece is overloaded when it\'s defending two or more things at once. Attack one of the things it defends, and when it responds, the other thing is left undefended.' },
        { title: 'Example', explanation: 'A Queen defends both a Bishop and a back rank. If you threaten the Bishop, the Queen must stay to defend it \u2014 but if you threaten the back rank instead, the Queen must go there, abandoning the Bishop.' },
        { title: 'Testing for Overloading', explanation: 'Count the defensive duties of each enemy piece. If any piece has more than one job, see if you can exploit it. Attack one responsibility; the other crumbles.' },
        { title: 'Creating Overloads', explanation: 'You can create overloads through exchanges. Trade off one of the two defenders, leaving the remaining piece overloaded. This is a common technique in the middlegame.' },
      ],
    },
    {
      id: 'smothered-mate',
      name: 'Smothered Mate Pattern',
      description: 'The Knight delivers mate surrounded by friends.',
      steps: [
        { title: 'What Is Smothered Mate?', explanation: 'Smothered mate occurs when a Knight checkmates a King that is completely surrounded by its own pieces. The King has no escape squares because its own army blocks it!', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1' },
        { title: 'Classic Pattern', explanation: 'The typical smothered mate: Knight on f7 checks the King on h8. The King is hemmed in by its own Rook on g8 and pawns on g7/h7.', fen: '6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1' },
        { title: 'Philidor\'s Legacy', explanation: 'The most famous smothered mate pattern involves a Queen sacrifice! The Queen checks, forcing the Rook to block, then the Knight delivers smothered mate. It\'s one of chess\'s most beautiful combinations.' },
        { title: 'Spotting It', explanation: 'Look for smothered mate when: (1) the enemy King is in the corner, (2) surrounded by its own pieces, (3) your Knight can reach a checking square. The Queen sacrifice version requires a back rank threat too.' },
      ],
    },
    {
      id: 'named-mates',
      name: 'Arabian & Anastasia\'s Mate',
      description: 'Two classic checkmate patterns.',
      steps: [
        { title: 'Arabian Mate', explanation: 'Rook delivers checkmate on the edge of the board, supported by a Knight that also covers the King\'s escape squares. Own pawns trap the King in the corner.', fen: '6k1/5pp1/5N2/8/8/8/8/6KR w - - 0 1', arrows: [{ from: 'h1', to: 'h8' }] },
        { title: 'Arabian Mate Position', explanation: 'The Knight on f6 covers g8 and h7, while the Rook delivers checkmate on h8. The f7 and g7 pawns block escape. This pattern occurs frequently in practical games.', fen: '6kR/5pp1/5N2/8/8/8/8/6K1 b - - 1 1' },
        { title: 'Anastasia\'s Mate', explanation: 'A Rook and Knight combine to checkmate on the h-file. The Knight on e7 covers g8 and g6, while the Rook controls the entire h-file, trapping the King.', fen: '5r1k/4Npp1/8/8/8/8/8/6KR w - - 0 1', arrows: [{ from: 'h1', to: 'h6' }] },
        { title: 'Pattern Recognition', explanation: 'The more mating patterns you know, the more you\'ll spot them in your games. Arabian and Anastasia\'s mates reward players who coordinate Rooks and Knights effectively.' },
      ],
    },
    {
      id: 'combining-patterns',
      name: 'Combining Patterns',
      description: 'Chain multiple tactical ideas together.',
      steps: [
        { title: 'Tactics in Combination', explanation: 'Real games rarely feature single tactics in isolation. The best combinations chain multiple patterns: a pin sets up a fork, a deflection leads to a back rank mate, etc.' },
        { title: 'Two-Step Thinking', explanation: 'Train yourself to think: "If I do X, my opponent does Y, then I can do Z." Most tactics are 2-3 moves deep. The first move often looks like a sacrifice, but it sets up the winning blow.' },
        { title: 'Example: Deflection + Fork', explanation: 'Step 1: Sacrifice a Bishop to deflect the Queen. Step 2: Knight forks King and Rook. You gave up a Bishop (3) but won a Rook (5) \u2014 net +2 material.' },
        { title: 'How to Improve', explanation: 'Solve tactical puzzles daily! Start with 1-move tactics, then 2-move, then 3-move. Pattern recognition builds through repetition. Even 15 minutes a day of puzzle training makes a huge difference.' },
      ],
    },
  ],
};

// Courses 3-8 defined in continuation below
// Placeholder exports — will be populated with full content

const openingRepertoire: AcademyCourse = {
  id: 'opening-repertoire',
  name: 'Opening Repertoire',
  description: 'Build a solid opening repertoire for both colors.',
  icon: '\u{1F4D6}',
  color: '#3b82f6',
  level: 'intermediate',
  ratingRange: '900-1200',
  certificate: { name: 'Opening Scholar', icon: '\u{1F4D6}' },
  lessons: [
    {
      id: 'opening-review', name: 'Opening Principles Review', description: 'Revisit the three pillars of opening play.',
      steps: [
        { title: 'The Three Pillars', explanation: 'Every good opening follows three principles: (1) control the center, (2) develop pieces, (3) get your king to safety. Before learning specific openings, internalize these rules.' },
        { title: 'Center Control', explanation: 'Occupy or control e4, d4, e5, d5 with pawns and pieces. A strong center restricts your opponent and gives your pieces mobility.', highlights: ['e4','d4','e5','d5'] },
        { title: 'Rapid Development', explanation: 'Aim to develop all minor pieces within the first 10 moves. Each tempo (turn) matters \u2014 every undeveloped piece is a soldier not in the fight.' },
        { title: 'King Safety', explanation: 'Castle early. An uncastled king in the center is a tactical target. Once castled, your rooks connect and your king is tucked away safely.' },
      ],
    },
    {
      id: 'italian', name: 'Italian Game', description: '1.e4 e5 2.Nf3 Nc6 3.Bc4 \u2014 Classic attacking chess.',
      steps: [
        { title: 'The Italian Game', explanation: 'One of the oldest openings. White develops naturally and aims the bishop at Black\'s vulnerable f7 square. It leads to open, tactical play perfect for improving players.' },
        { move: 'e4', title: '1. e4', explanation: 'Claim the center and open lines for the bishop and queen.', arrows: [{ from: 'e2', to: 'e4' }] },
        { move: 'e5', title: '1...e5', explanation: 'Black fights for the center symmetrically.' },
        { move: 'Nf3', title: '2. Nf3', explanation: 'Develop with tempo \u2014 the knight attacks e5.', arrows: [{ from: 'g1', to: 'f3' }] },
        { move: 'Nc6', title: '2...Nc6', explanation: 'Defend e5 and develop.' },
        { move: 'Bc4', title: '3. Bc4', explanation: 'The Italian! Bishop eyes f7, the weakest square near Black\'s king.', arrows: [{ from: 'f1', to: 'c4' }, { from: 'c4', to: 'f7' }] },
        { title: 'Key Plans', explanation: 'White typically plays O-O, then c3+d4 to build a strong center. Watch for tactical shots on f7 and the Giuoco Piano (3...Bc5) or Two Knights (3...Nf6) responses.' },
      ],
    },
    {
      id: 'london', name: 'London System', description: '1.d4 d5 2.Nf3 Nf6 3.Bf4 \u2014 Solid and reliable.',
      steps: [
        { title: 'The London System', explanation: 'A system opening \u2014 White plays the same setup regardless of Black\'s response. Easy to learn, hard to crack. Used by Magnus Carlsen!' },
        { move: 'd4', title: '1. d4', explanation: 'The queen\'s pawn opening. The d4 pawn is already protected by the queen.' },
        { move: 'd5', title: '1...d5', explanation: 'Black mirrors the solid approach.' },
        { move: 'Bf4', title: '2. Bf4', explanation: 'The London move! Develop the bishop BEFORE e3 locks it in. This bishop controls e5.', arrows: [{ from: 'c1', to: 'f4' }] },
        { move: 'Nf6', title: '2...Nf6', explanation: 'Natural development from Black.' },
        { move: 'e3', title: '3. e3', explanation: 'Now e3 is fine \u2014 the bishop is already out. Solid pawn chain on d4-e3.' },
        { title: 'London Setup', explanation: 'Complete the setup: Nf3, Bd3, O-O, Nbd2, c3. Then look to break with e4 or c4. The London gives a comfortable, risk-free position.' },
      ],
    },
    {
      id: 'sicilian', name: 'Sicilian Defense', description: '1...c5 \u2014 The most popular fighting defense.',
      steps: [
        { title: 'The Sicilian', explanation: 'The #1 response to 1.e4 at all levels. Black creates an asymmetric position with chances for both sides. Complex and deeply theoretical.' },
        { move: 'e4', title: '1. e4', explanation: 'White claims the center.' },
        { move: 'c5', title: '1...c5', explanation: 'The Sicilian! Black fights for d4 with the c-pawn, creating asymmetry.', arrows: [{ from: 'c7', to: 'c5' }], highlights: ['d4'] },
        { move: 'Nf3', title: '2. Nf3', explanation: 'Preparing d4 \u2014 the Open Sicilian.' },
        { move: 'd6', title: '2...d6', explanation: 'Flexible \u2014 keeps Najdorf, Dragon, and Classical options open.' },
        { move: 'd4', title: '3. d4 cxd4 4. Nxd4', explanation: 'The pawn exchange opens the c-file for Black. White has central space; Black has the half-open c-file.', arrows: [{ from: 'd2', to: 'd4' }] },
        { title: 'Sicilian Plans', explanation: 'White attacks kingside, Black counterattacks queenside. The Sicilian rewards preparation and tactical alertness.' },
      ],
    },
    {
      id: 'french', name: 'French Defense', description: '1...e6 \u2014 Solid and strategic.',
      steps: [
        { title: 'The French Defense', explanation: 'Black plays 1...e6 to support ...d5 on the next move. The French leads to closed, strategic positions with clear plans for both sides.' },
        { move: 'e4', title: '1. e4', explanation: 'White\'s most popular opening move.' },
        { move: 'e6', title: '1...e6', explanation: 'Preparing ...d5 with pawn support. The downside: the light-squared bishop on c8 gets blocked.', arrows: [{ from: 'e7', to: 'e6' }] },
        { move: 'd4', title: '2. d4 d5', explanation: 'Both sides establish central pawns. Now e4 is challenged.' },
        { title: 'Main Lines', explanation: 'White chooses: 3.Nc3 (Classical/Winawer), 3.Nd2 (Tarrasch), or 3.e5 (Advance). Each leads to different pawn structures and plans.' },
        { title: 'French Strategy', explanation: 'Black\'s plan: attack the d4 pawn with ...c5, activate the bad bishop (trade it or play ...b6 Ba6). White tries to use space advantage on the kingside.' },
      ],
    },
    {
      id: 'caro-kann', name: 'Caro-Kann Defense', description: '1...c6 \u2014 Solid as a rock.',
      steps: [
        { title: 'The Caro-Kann', explanation: 'Like the French, Black prepares ...d5, but with c6 instead of e6. The advantage: the light-squared bishop stays free to develop to f5 or g4.' },
        { move: 'e4', title: '1. e4', explanation: 'White claims the center.' },
        { move: 'c6', title: '1...c6', explanation: 'Preparing ...d5. The c-pawn supports d5 without blocking the bishop.', arrows: [{ from: 'c7', to: 'c6' }] },
        { move: 'd4', title: '2. d4 d5', explanation: 'Black challenges the center immediately.' },
        { move: 'Nc3', title: '3. Nc3 dxe4 4. Nxe4 Bf5', explanation: 'The Classical variation. Black develops the bishop outside the pawn chain \u2014 the key advantage of the Caro-Kann!', arrows: [{ from: 'c8', to: 'f5' }] },
        { title: 'Caro-Kann Plans', explanation: 'Black aims for a solid, hard-to-break position. Develop naturally, castle kingside, and use the well-placed bishop. Karpov and Anand made careers with this defense.' },
      ],
    },
    {
      id: 'kings-indian', name: 'King\'s Indian Defense', description: '1...Nf6 ...g6 \u2014 Dynamic and aggressive.',
      steps: [
        { title: 'The King\'s Indian', explanation: 'Black lets White build a big center, then counterattacks it. A hypermodern approach that leads to sharp, dynamic positions.' },
        { move: 'd4', title: '1. d4 Nf6', explanation: 'Black develops the knight and delays committing pawns to the center.' },
        { move: 'c4', title: '2. c4 g6', explanation: 'Black fianchettoes \u2014 the bishop will go to g7, controlling the long diagonal.', arrows: [{ from: 'g7', to: 'a1' }] },
        { title: 'The Setup', explanation: 'Black plays ...Bg7, ...O-O, ...d6, then either ...e5 (Classical) or ...c5 (Benoni-style). The g7 bishop becomes a monster in the middlegame.' },
        { title: 'KID Plans', explanation: 'In the Classical (with ...e5), Black attacks on the kingside with ...f5-f4. White expands on the queenside with c5. It\'s a race \u2014 exciting chess!' },
      ],
    },
    {
      id: 'slav', name: 'Slav Defense', description: '1...d5 ...c6 \u2014 Solid queen\'s pawn defense.',
      steps: [
        { title: 'The Slav', explanation: 'One of the most reliable defenses to 1.d4. Black supports d5 with ...c6 while keeping the light-squared bishop free \u2014 combining the best of the QGD and Caro-Kann ideas.' },
        { move: 'd4', title: '1. d4 d5 2. c4 c6', explanation: 'Black supports d5 with the c-pawn. Unlike the QGD (...e6), the bishop on c8 isn\'t blocked.', arrows: [{ from: 'c7', to: 'c6' }] },
        { title: 'Main Line', explanation: 'After 3.Nf3 Nf6 4.Nc3, Black can play 4...dxc4 (Slav proper) grabbing the pawn, or 4...e6 (Semi-Slav) for maximum solidity.' },
        { title: 'Slav Plans', explanation: 'In the main Slav, Black plays ...Bf5 or ...Bg4 to develop the bishop actively. In the Semi-Slav, Black may play the sharp Meran or the solid Moscow variation.' },
      ],
    },
    {
      id: 'ruy-lopez', name: 'Ruy Lopez', description: '3.Bb5 \u2014 The Spanish Game, king of openings.',
      steps: [
        { title: 'The Ruy Lopez', explanation: 'The most classical of all openings, played since the 16th century. White puts pressure on Black\'s e5 pawn indirectly by pinning the knight that defends it.' },
        { move: 'e4', title: '1. e4 e5 2. Nf3 Nc6', explanation: 'Standard open game position.' },
        { move: 'Bb5', title: '3. Bb5', explanation: 'The Ruy Lopez! The bishop pins the knight that defends e5. White threatens Bxc6 followed by Nxe5.', arrows: [{ from: 'f1', to: 'b5' }, { from: 'b5', to: 'c6' }] },
        { title: 'Black\'s Responses', explanation: '3...a6 (Morphy Defense) is most popular, asking the bishop its intentions. 3...Nf6 (Berlin) is ultra-solid. 3...f5 (Schliemann) is sharp and rare.' },
        { title: 'Ruy Lopez Plans', explanation: 'White typically plays O-O, Re1, d3 or c3+d4. The Ruy Lopez leads to rich middlegames with long-term strategic battles. Knowing it is essential!' },
      ],
    },
    {
      id: 'queens-gambit', name: 'Queen\'s Gambit', description: '2.c4 \u2014 The classic d4 opening.',
      steps: [
        { title: 'The Queen\'s Gambit', explanation: 'Not actually a true gambit \u2014 White offers the c4 pawn but can always recapture. It\'s one of the most solid and well-tested openings, seen at the highest level.' },
        { move: 'd4', title: '1. d4 d5 2. c4', explanation: 'White offers the c-pawn to divert Black\'s d5 pawn from the center.', arrows: [{ from: 'c2', to: 'c4' }] },
        { title: 'Accept or Decline?', explanation: '2...dxc4 (QGA): Black takes but must give the center. 2...e6 (QGD): Black holds the center but locks in the bishop. 2...c6 (Slav): supports d5 flexibly.' },
        { title: 'QG Plans', explanation: 'White aims for a strong center with e4 eventually. Black must find a way to solve the problem of the c8 bishop. Classic strategic chess!' },
      ],
    },
    {
      id: 'scotch', name: 'Scotch Game', description: '3.d4 \u2014 Open the center immediately.',
      steps: [
        { title: 'The Scotch Game', explanation: 'White opens the center on move 3 with d4. Unlike the Italian or Ruy Lopez, the Scotch leads to open, concrete positions early. Kasparov revived it at the top level.' },
        { move: 'e4', title: '1. e4 e5 2. Nf3 Nc6 3. d4', explanation: 'White immediately strikes in the center!', arrows: [{ from: 'd2', to: 'd4' }] },
        { title: 'After 3...exd4 4.Nxd4', explanation: 'White has a centralized knight and open position. Black must play precisely. The main lines are 4...Nf6, 4...Bc5, and 4...Qh4 (tricky but sound).' },
        { title: 'Scotch Plans', explanation: 'White aims for active piece play and central control. It\'s a good weapon to avoid deep Ruy Lopez theory while still playing ambitious chess.' },
      ],
    },
    {
      id: 'scandinavian', name: 'Scandinavian Defense', description: '1...d5 \u2014 Challenge e4 immediately.',
      steps: [
        { title: 'The Scandinavian', explanation: 'Black immediately challenges e4 with 1...d5. It\'s simple, direct, and avoids most of White\'s preparation. The cost: Black\'s queen comes out early after exd5 Qxd5.' },
        { move: 'e4', title: '1. e4 d5', explanation: 'Direct confrontation! Black challenges the e4 pawn immediately.' },
        { move: 'exd5', title: '2. exd5 Qxd5', explanation: 'Black recaptures with the queen. After 3.Nc3, the queen retreats to a5 or d6.', arrows: [{ from: 'd8', to: 'd5' }] },
        { title: 'Scandinavian Plans', explanation: 'Black develops solidly: ...Nf6, ...Bf5 or ...Bg4, ...c6, ...e6. The position is easy to play and hard for White to get an advantage. Popular at club level.' },
      ],
    },
    {
      id: 'opening-traps', name: 'Common Opening Traps', description: 'Traps to know (and avoid falling into).',
      steps: [
        { title: 'Legal\'s Mate', explanation: 'In the Italian: 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? 5.Nxe5! Bxd1?? 6.Bxf7+ Ke7 7.Nd5#. The queen sacrifice leads to a spectacular checkmate!', fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6' },
        { title: 'Fishing Pole Trap', explanation: 'In the Ruy Lopez: after 3...Nf6 4.O-O Ng4!? Black threatens ...Qh4 and ...Nxh2. White must be careful not to fall for the kingside attack.' },
        { title: 'Elephant Trap', explanation: 'In the QGD: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5 6.Nxd5?? Nxd5! 7.Bxd8 Bb4+ wins the queen! The bishop check is the key.' },
        { title: 'How to Avoid Traps', explanation: 'Always check your opponent\'s threats. If a move looks "free," it might be a trap. When in doubt, play solid developing moves rather than grabbing material in unfamiliar positions.' },
      ],
    },
    {
      id: 'studying-openings', name: 'How to Study Openings', description: 'A practical guide to learning openings efficiently.',
      steps: [
        { title: 'Understand, Don\'t Memorize', explanation: 'The #1 mistake: memorizing moves without understanding why. For every move you learn, know the idea behind it. This way, if your opponent deviates, you can find the right response.' },
        { title: 'Depth vs Breadth', explanation: 'Better to know 2-3 openings deeply than 10 openings superficially. Pick one opening as White and one defense each against 1.e4 and 1.d4. Master those before branching out.' },
        { title: 'Study Master Games', explanation: 'Find games by strong players in your chosen openings. Watch how they handle typical middlegame positions that arise. The opening doesn\'t exist in isolation \u2014 it flows into the middlegame.' },
        { title: 'Practical Tips', explanation: 'Play your openings in online games and review afterward. Note where you went wrong or felt unsure. Focus study on those specific positions rather than memorizing more theory.' },
      ],
    },
    {
      id: 'transpositions', name: 'Transpositions', description: 'When different move orders reach the same position.',
      steps: [
        { title: 'What Is a Transposition?', explanation: 'A transposition occurs when different move orders reach the same position. For example, 1.d4 Nf6 2.c4 g6 and 1.Nf3 Nf6 2.c4 g6 3.d4 both reach the King\'s Indian.' },
        { title: 'Why Transpositions Matter', explanation: 'By understanding transpositions, you can: (1) avoid lines you don\'t like, (2) trick opponents into unfamiliar territory, (3) reach your favorite positions via different routes.' },
        { title: 'Common Examples', explanation: 'The English (1.c4) can transpose to QGD, KID, or Ruy Lopez structures. 1.Nf3 is flexible and can transpose into virtually any d4 opening. Knowing these connections expands your repertoire.' },
        { title: 'Using Transpositions', explanation: 'If you play the London as White, you might reach it via 1.d4, 1.Nf3, or even 1.Bf4. Understanding transpositions lets you deploy your system from any starting move.' },
      ],
    },
    {
      id: 'building-repertoire', name: 'Building Your Repertoire', description: 'Assemble a complete set of openings.',
      steps: [
        { title: 'What You Need', explanation: 'A complete repertoire requires: (1) an opening as White, (2) a defense against 1.e4, (3) a defense against 1.d4, (4) responses to sidelines (1.c4, 1.Nf3, etc.).' },
        { title: 'Choose Your Style', explanation: 'Tactical players might choose: Italian/Scotch as White, Sicilian vs 1.e4, KID vs 1.d4. Positional players might prefer: London/QGD as White, Caro-Kann vs 1.e4, Slav vs 1.d4.' },
        { title: 'Start Simple', explanation: 'Begin with openings that have clear plans and few critical lines. The London, Italian, Caro-Kann, and Slav are all excellent starting choices. Add complexity as you improve.' },
        { title: 'Evolve Over Time', explanation: 'Your repertoire will change as you grow. That\'s normal! The openings you learn early teach you chess fundamentals. Later, you\'ll gravitate toward openings that match your style.' },
      ],
    },
  ],
};

const intermediateTactics: AcademyCourse = {
  id: 'intermediate-tactics',
  name: 'Intermediate Tactics',
  description: 'Advanced tactical patterns for competitive play.',
  icon: '\u{1F525}',
  color: '#f97316',
  level: 'intermediate',
  ratingRange: '1200-1500',
  certificate: { name: 'Combination Master', icon: '\u{1F525}' },
  lessons: [
    {
      id: 'zwischenzug', name: 'Zwischenzug (In-Between Move)', description: 'The surprise intermediate move.',
      steps: [
        { title: 'What Is Zwischenzug?', explanation: 'German for "in-between move." Instead of making the expected recapture, you insert a surprising move (usually a check or threat) first. This can completely change the evaluation of a position.' },
        { title: 'Why It Works', explanation: 'Your opponent expects you to recapture. When you play an unexpected check or threat instead, they must respond to it, and then the recapture happens on better terms for you.' },
        { title: 'Example', explanation: 'Your opponent captures your bishop. Instead of recapturing immediately, you give check with another piece first. After the king moves, THEN you recapture \u2014 winning a tempo or improving your position.' },
        { title: 'How to Spot Them', explanation: 'Before making any "automatic" recapture, pause and ask: "Is there a check, capture, or threat I can insert first?" This habit will help you find zwischenzugs regularly.' },
      ],
    },
    {
      id: 'greek-gift', name: 'Greek Gift Sacrifice (Bxh7+)', description: 'The classic bishop sacrifice on h7.',
      steps: [
        { title: 'The Greek Gift', explanation: 'One of the most famous attacking patterns: White sacrifices the bishop on h7 to expose Black\'s king. It requires specific conditions but leads to devastating attacks.', fen: 'r1bq1rk1/pppn1ppp/4p3/3p4/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 8' },
        { title: 'Conditions', explanation: 'For Bxh7+ to work: (1) White has a bishop on d3 and knight on f3, (2) Black has castled kingside, (3) Black\'s f6 knight has moved away or is absent, (4) Black can\'t easily block with ...Nf6.' },
        { title: 'The Attack', explanation: 'After Bxh7+ Kxh7, Ng5+ forces the king to h6 (or h8/g8). Then Qh5 (or Qd3+) follows with a crushing attack. White brings queen and knight to the kingside with devastating effect.' },
        { title: 'Defending Against It', explanation: 'If someone plays Bxh7+, don\'t panic! Sometimes declining with Kh8 is better than Kxh7. Calculate carefully whether the attack really works before accepting the sacrifice.' },
      ],
    },
    {
      id: 'clearance', name: 'Clearance Sacrifices', description: 'Remove your own piece to unleash another.',
      steps: [
        { title: 'What Is a Clearance Sacrifice?', explanation: 'You sacrifice your own piece to clear a square, file, or diagonal for another piece. The sacrificed piece is "in the way" of a more powerful move.' },
        { title: 'Clearing a Square', explanation: 'Your knight is on e5, but your queen needs that square for checkmate. You sacrifice the knight (Nxf7 or Nd7+), clearing e5 for Qe5#. The sacrifice opens the path.' },
        { title: 'Clearing a File/Diagonal', explanation: 'Your rook blocks your bishop\'s diagonal. Sacrifice the rook (even for nothing!), and the bishop delivers a devastating discovered attack or checkmate.' },
        { title: 'Recognizing Clearance', explanation: 'When you see a strong move that\'s blocked by your own piece, ask: "Can I sacrifice this piece with gain?" Often the clearance move comes with check or a threat, making it free.' },
      ],
    },
    {
      id: 'interference', name: 'Interference', description: 'Block the connection between enemy pieces.',
      steps: [
        { title: 'What Is Interference?', explanation: 'Interference places a piece between two enemy pieces that defend each other or coordinate on a line. By interrupting their connection, you create tactical opportunities.' },
        { title: 'Breaking Defense Lines', explanation: 'If a rook defends a piece along a file, placing your bishop between them blocks the defense. The defended piece is now unprotected!' },
        { title: 'Interference Example', explanation: 'Black\'s rook on a8 defends the rook on a1. If you place a knight on a4, it blocks the file, and the rook on a1 is no longer defended.' },
        { title: 'When to Look for It', explanation: 'Interference opportunities arise when enemy pieces are aligned on ranks, files, or diagonals. Look for ways to interrupt critical defensive lines, especially with forcing moves.' },
      ],
    },
    {
      id: 'windmill', name: 'The Windmill', description: 'A devastating repeating discovered attack.',
      steps: [
        { title: 'What Is a Windmill?', explanation: 'The windmill is a repeating pattern of discovered checks. A piece gives discovered check, captures material while the opponent deals with the check, then returns to give another discovered check.' },
        { title: 'Classic Example', explanation: 'Torre vs Lasker, 1925: White\'s rook on the 7th rank gives discovered check by moving, captures a piece, returns to give another discovered check. This repeats, harvesting material each cycle.' },
        { title: 'How It Works', explanation: 'Piece A gives discovered check from piece B. The king moves. Piece A captures something, then moves back to let piece B check again. This cycle can repeat multiple times.' },
        { title: 'Spotting Windmills', explanation: 'Look for positions where you have a battery on a line to the enemy king. If the front piece can move to capture something and return to its battery position, you might have a windmill.' },
      ],
    },
    {
      id: 'pawn-break', name: 'Pawn Breakthroughs', description: 'When pawns break through the defense.',
      steps: [
        { title: 'Pawn Breakthrough', explanation: 'A pawn breakthrough is a tactical device where advancing pawns sacrifice themselves to create a passed pawn that promotes. Even with equal material, a breakthrough can win!' },
        { title: 'Classic Example', explanation: 'White: pawns a5, b5, c5 vs Black: pawns a7, b7, c7. White plays b6! If axb6, a6! creates an unstoppable passed pawn. If cxb6, c6! does the same.', fen: '4k3/ppp5/8/PPP5/8/2K5/8/8 w - - 0 1' },
        { title: 'How to Calculate', explanation: 'Count the pawn moves to promotion. If your passed pawn promotes before your opponent can deal with it, the breakthrough works. Factor in which pieces can help or hinder.' },
        { title: 'Practical Application', explanation: 'Pawn breakthroughs often appear in endgames with a pawn majority on one wing. Advance all three pawns together \u2014 one will sacrifice to let another through.' },
      ],
    },
    {
      id: 'xray', name: 'X-Ray Attacks', description: 'Attack through another piece.',
      steps: [
        { title: 'What Is an X-Ray Attack?', explanation: 'An X-ray (or skewer through a piece) is when a long-range piece attacks through another piece. The "invisible" attack behind the front piece provides hidden support or threats.' },
        { title: 'X-Ray Defense', explanation: 'Your rook on e1 defends a rook on e8 "through" an enemy piece on e5. Even though the piece blocks the line, if the e5 piece moves, your rook protects e8.' },
        { title: 'X-Ray Attack', explanation: 'Your queen on d1 "x-rays" through d5 to d8. If the piece on d5 moves, your queen controls d8. This hidden influence can be decisive in calculating combinations.' },
        { title: 'Using X-Rays', explanation: 'Always be aware of long-range piece alignment. Rooks, bishops, and queens can exert X-ray influence. This hidden power often determines whether combinations work or fail.' },
      ],
    },
    {
      id: 'trapped-pieces', name: 'Trapped Pieces & Domination', description: 'Lock down enemy pieces.',
      steps: [
        { title: 'Trapped Pieces', explanation: 'A piece is trapped when it has no safe squares to move to. Even powerful pieces can be trapped if they venture too deep into enemy territory. A trapped piece is almost as good as a captured one!' },
        { title: 'Common Traps', explanation: 'Bishop trapped on a7/a2 by pawns (the Noah\'s Ark trap in the Ruy Lopez). Knight on the rim with no retreat squares. Queen lured deep and surrounded by minor pieces.' },
        { title: 'Domination', explanation: 'Domination occurs when a piece controls all the squares another piece can go to. The dominated piece is effectively dead. Knights can be dominated by bishops on open boards.' },
        { title: 'Avoiding Being Trapped', explanation: 'Before moving a piece forward, always check: "Can it get back?" Don\'t place pieces on the edge without retreat routes. And watch for pawn advances that cut off your piece\'s escape.' },
      ],
    },
    {
      id: 'desperado', name: 'Desperado Tactics', description: 'If you\'re losing a piece, sell it dearly.',
      steps: [
        { title: 'What Is a Desperado?', explanation: 'A piece that\'s going to be captured anyway is a "desperado." Since it\'s doomed, make it do maximum damage before it goes! Capture the most valuable thing you can with it.' },
        { title: 'Example', explanation: 'Both sides have a bishop attacked. Instead of retreating your bishop, capture their rook with it! Your bishop was dead anyway, so you might as well take the most valuable target.' },
        { title: 'Mutual Captures', explanation: 'In positions with multiple captures available, the piece that captures FIRST often gains the advantage. This is the desperado principle: if your piece is doomed, act first.' },
        { title: 'Practical Advice', explanation: 'When in a complex tactical position, before accepting a loss, check if the doomed piece can do something useful on its way out. Captures with check are especially powerful desperado moves.' },
      ],
    },
    {
      id: 'cross-check', name: 'Cross-Check and Counter-Threats', description: 'Fight back with forcing moves.',
      steps: [
        { title: 'Cross-Check', explanation: 'When your opponent gives check, sometimes you can block with a piece that simultaneously gives check back! This "cross-check" disrupts their attack and seizes the initiative.' },
        { title: 'Counter-Threats', explanation: 'Instead of passively defending against a threat, create a bigger threat of your own. If your opponent threatens your rook but you threaten checkmate, they must deal with your threat first!' },
        { title: 'Defensive Forcing Moves', explanation: 'The best defense is often a counter-attack. Checks, captures, and threats work defensively too. Block an attack with a piece that simultaneously creates a threat \u2014 maximum efficiency.' },
        { title: 'Thinking in Forcing Sequences', explanation: 'During tactical complications, always consider counter-threats before passive defense. The ability to see defensive resources is what separates intermediate from advanced players.' },
      ],
    },
    {
      id: 'battery', name: 'Battery Tactics (Alekhine\'s Gun)', description: 'Stack pieces for maximum power.',
      steps: [
        { title: 'What Is a Battery?', explanation: 'A battery is two (or more) pieces aligned on the same rank, file, or diagonal. They multiply each other\'s power. Common batteries: Queen + Bishop on diagonal, two Rooks on a file.' },
        { title: 'Alekhine\'s Gun', explanation: 'The ultimate battery: Queen behind two Rooks on the same file. Named after Alexander Alekhine. The rooks lead the charge, and the queen provides overwhelming firepower behind them.' },
        { title: 'Building Batteries', explanation: 'Stack your pieces gradually: place a rook on an open file, add the second rook, then align the queen. Each addition multiplies the pressure. Your opponent must dedicate resources to defending.' },
        { title: 'Using Batteries', explanation: 'Batteries are most effective on open or half-open files/diagonals. Aim them at weak points in your opponent\'s position: the king, backward pawns, or undefended pieces.' },
      ],
    },
    {
      id: 'preventing-castling', name: 'Preventing Castling', description: 'Keep the enemy king in the center.',
      steps: [
        { title: 'Why Prevent Castling?', explanation: 'A king stuck in the center is vulnerable to attacks from both sides. If you can prevent your opponent from castling, the center becomes dangerous and open lines become lethal.' },
        { title: 'Methods', explanation: 'Give checks that force the king to move (losing castling rights). Open the center with pawn breaks when the king hasn\'t castled. Pin the rook or create threats on the castling squares.' },
        { title: 'Exploiting a Central King', explanation: 'Once the king is stuck in the center: (1) open files with pawn exchanges, (2) control the center completely, (3) use your rooks and queen to attack along open lines.' },
        { title: 'Classic Examples', explanation: 'Many famous miniatures feature a sacrifice that prevents castling, followed by a devastating central attack. The opponent\'s undeveloped pieces can\'t help defend the exposed king.' },
      ],
    },
    {
      id: 'multi-move', name: 'Multi-Move Combinations', description: 'Combinations that are 3-5 moves deep.',
      steps: [
        { title: 'Beyond Two Moves', explanation: 'Real game combinations often require 3-5 moves of accurate calculation. The first move sets up the second, which sets up the third. Each move is forcing (check, capture, or threat).' },
        { title: 'Calculation Method', explanation: 'Identify candidate moves (checks, captures, threats). For each, calculate your opponent\'s best response. Then find YOUR best response to that. Build a tree of variations, pruning bad lines early.' },
        { title: 'Visualization', explanation: 'You must "see" the position 3-5 moves ahead in your mind. Practice by solving puzzles without moving pieces. Start with 2-move problems and gradually increase depth.' },
        { title: 'Common Patterns', explanation: 'Most long combinations use patterns you already know: fork, pin, skewer, discovered attack. The skill is chaining them together. A sacrifice on move 1 leads to a fork on move 3 that wins material on move 5.' },
      ],
    },
    {
      id: 'advanced-mates', name: 'Advanced Checkmate Patterns', description: 'Boden\'s, Greco\'s, Opera, and Legal\'s Mate.',
      steps: [
        { title: 'Boden\'s Mate', explanation: 'Two bishops deliver checkmate on criss-crossing diagonals. The king is trapped by its own pieces (knight, rook, pawns). Ba6# is checkmate with Be6 covering d7.', fen: '1nkr4/p1p5/B3B3/8/8/8/8/4K3 b - - 0 1', highlights: ['a6', 'e6', 'c8'] },
        { title: 'Greco\'s Mate', explanation: 'A rook and bishop coordinate: the bishop controls the diagonal escape, the rook delivers checkmate on the h-file. The king is trapped in the corner by its own pawns.', fen: '6k1/5pp1/8/2B5/8/8/8/6KR w - - 0 1', arrows: [{ from: 'h1', to: 'h8' }] },
        { title: 'Opera Mate', explanation: 'Named after Morphy\'s famous 1858 game at the opera. A rook delivers mate on the back rank, supported by a bishop. The knight controls escape squares. Elegant and instructive.' },
        { title: 'Legal\'s Mate', explanation: 'A queen sacrifice followed by a minor piece checkmate. Nxe5 sacrifices the queen, then Bxf7+ Ke7 Nd5# (or similar). It punishes greedy queen captures. Know this pattern to avoid falling for it and to deliver it!' },
      ],
    },
  ],
};

const positionalChess: AcademyCourse = {
  id: 'positional-chess',
  name: 'Positional Chess',
  description: 'Master pawn structures, piece placement, and strategic planning.',
  icon: '\u{1F3F0}',
  color: '#a855f7',
  level: 'intermediate',
  ratingRange: '1200-1600',
  certificate: { name: 'Strategist', icon: '\u{1F3F0}' },
  lessons: [
    {
      id: 'pawn-structure', name: 'Pawn Structure Fundamentals', description: 'Pawns are the skeleton of your position.',
      steps: [
        { title: 'Why Pawn Structure Matters', explanation: 'Pawns can\'t move backward. Every pawn move permanently changes the position. Pawn structure determines where pieces are strong or weak, and what plans are available.' },
        { title: 'Doubled Pawns', explanation: 'Two pawns on the same file are "doubled." They can\'t protect each other and are often weak. However, they open a file for your rook, so they\'re not always bad.' },
        { title: 'Isolated Pawns', explanation: 'A pawn with no friendly pawns on adjacent files is "isolated." It can\'t be defended by another pawn and becomes a target. But it can also give piece activity and central control.' },
        { title: 'Backward Pawns', explanation: 'A pawn that can\'t advance because the square in front is controlled by an enemy pawn, and it can\'t be supported by adjacent pawns. It\'s a static weakness that can be attacked.' },
        { title: 'Passed Pawns', explanation: 'A pawn with no enemy pawns blocking or guarding its path to promotion is a "passed pawn." Passed pawns are powerful \u2014 they must be stopped by pieces, tying down your opponent\'s army.' },
      ],
    },
    {
      id: 'iqp', name: 'The Isolated Queen\'s Pawn', description: 'One of the most important pawn structures.',
      steps: [
        { title: 'What Is the IQP?', explanation: 'An isolated d-pawn (usually on d4 for White or d5 for Black) with no pawns on the c or e files. It arises from many openings: QGA, Nimzo-Indian, French, Caro-Kann.', fen: 'r1bqr1k1/pp3ppp/2nb1n2/3p4/3P4/2NB1N2/PP3PPP/R1BQR1K1 w - - 0 10' },
        { title: 'IQP Advantages', explanation: 'The IQP controls key central squares (c5, e5). Pieces are active, especially on the half-open c and e files. There\'s dynamic potential with d4-d5 pawn breaks. Piece activity compensates for the weak pawn.' },
        { title: 'IQP Disadvantages', explanation: 'The pawn on d4 can\'t be defended by other pawns. The square in front (d5) is a potential outpost for your opponent. In the endgame, the IQP often becomes a liability.' },
        { title: 'Playing With/Against', explanation: 'WITH the IQP: keep pieces on, seek kingside attacks, play d4-d5 at the right moment. AGAINST: trade pieces to reach an endgame where the IQP is weak, control d5, blockade.' },
      ],
    },
    {
      id: 'hanging-pawns', name: 'Hanging Pawns & Carlsbad Structure', description: 'Common pawn formations in d4 openings.',
      steps: [
        { title: 'Hanging Pawns', explanation: 'Two adjacent pawns (typically c4+d4) without pawn support on either side. They\'re dynamic but vulnerable. If one advances, the other becomes isolated.', fen: 'r1bq1rk1/pp3ppp/2n2n2/8/2PP4/2N2N2/PP3PPP/R1BQ1RK1 w - - 0 9' },
        { title: 'Hanging Pawns Strategy', explanation: 'The side with hanging pawns wants to advance one (d4-d5 or c4-c5) at the right moment for a breakthrough. The opponent wants to provoke an advance or force a weakness.' },
        { title: 'Carlsbad Structure', explanation: 'White pawns on c4, d4, e3 vs Black pawns on c6, d5, e6. A symmetric structure from the QGD/Slav. Plans: minority attack (b4-b5) for White, kingside play for Black.' },
        { title: 'Minority Attack', explanation: 'Advance the b-pawn to b5 to exchange it for Black\'s c6 pawn, creating a backward pawn on c6 or isolated pawn on d5. This classic plan is the hallmark of the Carlsbad.' },
      ],
    },
    {
      id: 'french-sicilian-structures', name: 'French & Sicilian Structures', description: 'Key pawn formations from e4 openings.',
      steps: [
        { title: 'French Structure', explanation: 'White e5 vs Black d5, e6. The pawn chain defines the game: White attacks on the kingside (f4-f5), Black on the queenside (...c5). The locked center means flank play is key.', fen: 'r1bqkb1r/pp3ppp/2n1pn2/2ppP3/3P4/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 5' },
        { title: 'Attacking the Chain', explanation: 'Black attacks the base of White\'s chain with ...c5 and ...f6. White attacks Black\'s chain base with f4-f5. The player who breaks through first usually gets the advantage.' },
        { title: 'Sicilian Structures', explanation: 'The Open Sicilian creates asymmetric pawn structures. White has a d4 pawn vs Black\'s d6. White has a central majority; Black has a queenside majority. This asymmetry drives the plans.' },
        { title: 'Hedgehog', explanation: 'Black pawns on a6, b6, d6, e6 with pieces behind them \u2014 compact but flexible. Black waits for White to overextend, then strikes with ...b5 or ...d5. Patience is the key virtue.' },
      ],
    },
    {
      id: 'good-bad-bishop', name: 'Good Bishop vs Bad Bishop', description: 'Not all bishops are created equal.',
      steps: [
        { title: 'Good vs Bad Bishop', explanation: 'A "good" bishop is on the opposite color from its own pawns, so the pawns don\'t block it. A "bad" bishop is on the same color, trapped behind its own pawns with limited mobility.' },
        { title: 'Why It Matters', explanation: 'A bad bishop is almost like having one less piece. It can\'t contribute to attack or defense effectively. Many games are won simply by having a good bishop vs a bad one.' },
        { title: 'Fixing the Bad Bishop', explanation: 'Options: (1) Trade it off for the opponent\'s good bishop or a knight. (2) Place it outside the pawn chain (like ...Bf5 in the Caro-Kann). (3) Change the pawn structure to free it.' },
        { title: 'Exploiting a Bad Bishop', explanation: 'If your opponent has a bad bishop: place pawns on its color to further restrict it, trade off their good pieces, and convert the advantage in an endgame where the bad bishop is nearly useless.' },
      ],
    },
    {
      id: 'bishop-pair', name: 'The Bishop Pair', description: 'Two bishops working together are powerful.',
      steps: [
        { title: 'Why Two Bishops Are Strong', explanation: 'Two bishops cover both colors and can work together to control long diagonals. In open positions, the bishop pair is worth about half a pawn more than bishop + knight or two knights.' },
        { title: 'Open the Position', explanation: 'With the bishop pair, open the position! Exchange pawns, clear diagonals, and let your bishops dominate. The bishops are strongest in open middlegames and endgames.' },
        { title: 'Playing Against the Bishop Pair', explanation: 'Keep the position closed with locked pawn chains. Create outposts for your knights. Trade one of the bishops if possible to eliminate the advantage.' },
        { title: 'When It Doesn\'t Matter', explanation: 'In very closed positions with blocked pawns, two knights can be better than two bishops. The bishop pair advantage is proportional to how open the position is.' },
      ],
    },
    {
      id: 'knights-vs-bishops', name: 'Knights vs Bishops', description: 'When each piece excels.',
      steps: [
        { title: 'Knight Strengths', explanation: 'Knights excel in closed positions with locked pawns. They can jump over pieces, use outposts, and they\'re strong in the center. Knights are better when the game is blocked.' },
        { title: 'Bishop Strengths', explanation: 'Bishops excel in open positions with few pawns. They control long diagonals and can influence both sides of the board simultaneously. Bishops are better in the endgame with pawns on both wings.' },
        { title: 'Practical Guidelines', explanation: 'If you have knights, keep the position closed. If you have bishops, open it up. When choosing which piece to trade for, consider what the resulting position will look like.' },
        { title: 'The Exception', explanation: 'A knight on a strong outpost (protected by a pawn, can\'t be challenged) can be as good as or better than a bishop, even in open positions. Position trumps general rules.' },
      ],
    },
    {
      id: 'outposts', name: 'Outposts', description: 'Permanent homes for your pieces.',
      steps: [
        { title: 'What Is an Outpost?', explanation: 'An outpost is a square in the enemy half of the board that is protected by your pawn and can\'t be attacked by enemy pawns. It\'s a permanent safe haven for your piece (usually a knight).' },
        { title: 'Ideal Outpost', explanation: 'A knight on d5 protected by a pawn on c4, with no Black pawns on c or e files to challenge it. This knight dominates the position and can\'t be driven away.', fen: 'r1bq1rk1/pp2bppp/8/3N4/2P5/5NP1/PP2PPBP/R1BQ1RK1 w - - 0 8', highlights: ['d5'] },
        { title: 'Creating Outposts', explanation: 'Exchange enemy pawns to create holes. If Black plays ...d5 and you exchange cxd5 exd5, the e5 or c5 squares may become outposts. Pawn exchanges should be strategic, not automatic.' },
        { title: 'Using Outposts', explanation: 'Place a knight on the outpost and build your position around it. The outpost knight ties down enemy pieces that must watch it. Support it with other pieces to dominate the position.' },
      ],
    },
    {
      id: 'open-files', name: 'Open Files and Rook Lifts', description: 'Activating your rooks.',
      steps: [
        { title: 'Open Files', explanation: 'An open file has no pawns on it. Rooks love open files \u2014 they can penetrate the enemy position, attack backward pawns, or reach the 7th rank. Control of an open file is a significant advantage.' },
        { title: 'Half-Open Files', explanation: 'A file with only YOUR pawn is half-open for your opponent. Your Rook can pressure their pawn on that file. Half-open files are common in asymmetric openings like the Sicilian (c-file for Black).' },
        { title: 'Rook Lifts', explanation: 'A rook lift moves the rook to the 3rd or 4th rank, then swings it sideways to attack. For example, Ra3-h3 brings the rook to the kingside. This creative maneuver catches opponents off guard.' },
        { title: 'Doubling Rooks', explanation: 'Two rooks on the same file multiply their power. The back rook supports the front one. Doubled rooks on the 7th rank is one of the most powerful configurations in chess.' },
      ],
    },
    {
      id: 'seventh-rank', name: 'The 7th Rank', description: 'Rooks on the 7th are devastating.',
      steps: [
        { title: 'Why the 7th Rank?', explanation: 'A rook on the 7th rank attacks pawns from behind (they can\'t run), restricts the enemy king to the back rank, and threatens multiple pawns simultaneously. It\'s worth about half a pawn extra.' },
        { title: 'Doubled Rooks on the 7th', explanation: 'Two rooks on the 7th rank is often a decisive advantage. They create threats everywhere \u2014 attacking pawns, threatening mate, and dominating the position.', fen: '6k1/1RR2ppp/8/8/8/8/5PPP/6K1 w - - 0 1' },
        { title: 'Getting to the 7th', explanation: 'To get a rook to the 7th: (1) control an open file, (2) penetrate into the enemy position, (3) reach the 7th. Sometimes a sacrifice opens the path to the 7th rank.' },
        { title: 'Defending Against 7th Rank Rooks', explanation: 'Keep your 2nd rank defended. A rook on your 2nd rank can neutralize the enemy rook. Trade rooks if possible to eliminate the threat.' },
      ],
    },
    {
      id: 'space', name: 'Space Advantage & Restriction', description: 'When your pieces have room and theirs don\'t.',
      steps: [
        { title: 'What Is Space?', explanation: 'Space means territory controlled by your pawns. More space gives your pieces more squares to maneuver. Less space cramps your opponent\'s pieces and limits their options.' },
        { title: 'Gaining Space', explanation: 'Advance pawns to claim territory: e4+d4 in the opening, or c4+d4+e4 for maximum space. But don\'t overextend \u2014 advanced pawns can become targets if not supported.' },
        { title: 'Playing with Space', explanation: 'With a space advantage: (1) maneuver pieces behind your pawn wall, (2) look for pawn breaks to open lines, (3) prevent your opponent from freeing their position. Don\'t rush \u2014 use your advantage methodically.' },
        { title: 'Playing Against Space', explanation: 'When cramped: (1) trade pieces to get breathing room, (2) look for pawn breaks (...c5, ...f5, ...d5) to challenge the center, (3) be patient and wait for overextension.' },
      ],
    },
    {
      id: 'minority-attack', name: 'The Minority Attack', description: 'Attack with fewer pawns to create weaknesses.',
      steps: [
        { title: 'What Is the Minority Attack?', explanation: 'Advance a minority of pawns (usually 2) against the opponent\'s majority (usually 3) to create structural weaknesses. Typically b4-b5 against c6/d5/e6, creating an isolated or backward pawn.' },
        { title: 'The Mechanism', explanation: 'White plays a4, b4, then b5. After b5 xb5, axb5 creates either an isolated c6 pawn or a backward pawn. These new weaknesses become targets for the middlegame and endgame.' },
        { title: 'When to Use It', explanation: 'The minority attack is ideal in the Carlsbad structure (from QGD/Exchange). White has pawns on c4+d4 vs Black\'s c6+d5+e6. The b-pawn advance creates lasting pressure.' },
        { title: 'Combining with Piece Play', explanation: 'While advancing the b-pawn, place your pieces to target the future weaknesses. A rook on the a or c file, a bishop on the a2-g8 diagonal, a knight heading toward d4 or c5.' },
      ],
    },
    {
      id: 'prophylaxis', name: 'Prophylaxis', description: 'Prevent your opponent\'s plans.',
      steps: [
        { title: 'What Is Prophylaxis?', explanation: 'Prophylaxis means preventing your opponent\'s ideas rather than just pursuing your own. Before each move, ask: "What does my opponent want to do?" Then stop it.' },
        { title: 'Nimzowitsch\'s Contribution', explanation: 'Aron Nimzowitsch popularized prophylactic thinking. His idea: first restrain, then blockade, then destroy. Take away your opponent\'s counterplay before beginning your own attack.' },
        { title: 'Practical Prophylaxis', explanation: 'Simple prophylaxis: h3 to prevent ...Bg4 pins. a3 to prevent ...Bb4 or ...Nb4. Moving the king before an endgame to avoid back rank threats. These small moves are incredibly valuable.' },
        { title: 'When to Be Prophylactic', explanation: 'When you have a lasting advantage, don\'t rush. Eliminate your opponent\'s counterplay first. When the position is stable, take time to improve your worst piece or prevent their best plan.' },
      ],
    },
    {
      id: 'two-weaknesses', name: 'Two Weaknesses Principle', description: 'One weakness can be defended; two cannot.',
      steps: [
        { title: 'The Principle', explanation: 'If your opponent has one weakness, they can usually defend it. But if you create a SECOND weakness on the other side of the board, the defender can\'t be everywhere at once. Pieces shuttling back and forth will crack.' },
        { title: 'How to Apply It', explanation: 'Attack one weakness to force your opponent to commit defenders there. Then switch to the other side of the board and create or attack a second weakness. The defender must split forces.' },
        { title: 'Classic Example', explanation: 'White has an isolated pawn on a7 to attack. Black defends it. White then creates pressure on the kingside with f4-f5. Black\'s pieces can\'t protect both sides simultaneously.' },
        { title: 'Winning Technique', explanation: 'This is one of the most important winning techniques in chess. When converting an advantage: don\'t just attack one thing repeatedly. Create a second front and stretch the defense until it breaks.' },
      ],
    },
    {
      id: 'planning', name: 'Planning & Position Evaluation', description: 'How to make a plan in any position.',
      steps: [
        { title: 'Position Evaluation', explanation: 'Before making a plan, evaluate: (1) material balance, (2) king safety, (3) piece activity, (4) pawn structure, (5) space, (6) threats. This checklist covers the essential factors.' },
        { title: 'Making a Plan', explanation: 'A plan is a series of moves with a goal. Good plans target weaknesses, improve piece placement, or create threats. The plan should flow from the evaluation \u2014 exploit advantages, fix disadvantages.' },
        { title: 'Flexible Planning', explanation: 'Don\'t make rigid, long-term plans. Instead, set short-term goals: "Improve my knight to d5," "Double rooks on the c-file," "Play for a kingside attack." Reassess after each goal is achieved.' },
        { title: 'The Key Question', explanation: 'Always ask: "What is the BEST piece and the WORST piece for both sides?" Improve your worst piece and try to trade off your opponent\'s best piece. This simple heuristic guides excellent strategic play.' },
      ],
    },
  ],
};

const endgameEssentials: AcademyCourse = {
  id: 'endgame-essentials',
  name: 'Endgame Essentials',
  description: 'Win more games by mastering critical endgame techniques.',
  icon: '\u{1F451}',
  color: '#f59e0b',
  level: 'intermediate',
  ratingRange: '1000-1600',
  certificate: { name: 'Endgame Expert', icon: '\u{1F451}' },
  lessons: [
    {
      id: 'endgame-principles', name: 'Endgame Principles: Activate Your King', description: 'The king becomes a fighting piece.',
      steps: [
        { title: 'The King Awakens', explanation: 'In the endgame, the king is no longer hiding \u2014 it\'s a fighting piece! With fewer pieces on the board, the king can safely advance and participate in the action. Centralizing the king is the #1 endgame principle.' },
        { title: 'King Centralization', explanation: 'Move your king toward the center early in the endgame. A centralized king can support pawn advances, attack enemy pawns, and control key squares. From e4/d4/e5/d5, the king reaches anywhere quickly.', fen: '8/5pk1/8/8/3K4/8/5P2/8 w - - 0 1', highlights: ['d4'] },
        { title: 'Active vs Passive', explanation: 'An active king (centralized, participating) vs a passive king (on the edge, doing nothing) is often the difference between winning and losing. Activate your king before your opponent does!' },
        { title: 'When to Activate', explanation: 'Activate the king when: queens are off the board, few pieces remain, and the king won\'t be mated. Be cautious if the opponent still has attacking pieces or a queen.' },
      ],
    },
    {
      id: 'opposition', name: 'King + Pawn vs King: Opposition', description: 'The most important endgame concept.',
      steps: [
        { title: 'What Is Opposition?', explanation: 'Opposition occurs when two kings face each other with one square between them on the same file or rank. The player who does NOT have to move has the opposition (an advantage), because the other king must give way.', fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1' },
        { title: 'Why It Matters', explanation: 'In K+P vs K, having the opposition often determines whether you can promote the pawn or not. The attacking king with opposition can outflank the defender and push the pawn through.' },
        { title: 'The Key Rule', explanation: 'If the attacking king is AHEAD of the pawn and has opposition, the pawn promotes. If the defending king has opposition, it\'s a draw (with correct play).', fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1' },
        { title: 'Taking the Opposition', explanation: 'To take the opposition, move your king so it faces the enemy king with one square between them. Then wait: the opponent must move, and their king steps aside, letting your king advance.' },
      ],
    },
    {
      id: 'square-rule', name: 'The Square Rule', description: 'Can the king catch the pawn?',
      steps: [
        { title: 'The Square Rule', explanation: 'Draw an imaginary square from the pawn to its promotion square. If the defending king can step into this square on their turn, they catch the pawn. If not, the pawn promotes.', fen: '8/8/8/1k6/8/8/7P/4K3 w - - 0 1', highlights: ['h2', 'h8'] },
        { title: 'How to Visualize', explanation: 'From the pawn\'s square, count the number of ranks to promotion. Draw a square with that side length, extending toward the defending king. If the king is inside or can step inside, it catches the pawn.' },
        { title: 'Why It\'s Useful', explanation: 'The square rule lets you instantly calculate whether a passed pawn can promote or be caught. No need to count moves one by one \u2014 just visualize the square!' },
        { title: 'Exceptions', explanation: 'The square rule assumes no other pieces are in the way. If pieces block the king\'s path or the pawn\'s path, you need to calculate more carefully. But for pure K+P vs K races, it\'s infallible.' },
      ],
    },
    {
      id: 'pawn-races', name: 'Pawn Races & Outside Passed Pawns', description: 'Racing pawns to promotion.',
      steps: [
        { title: 'Pawn Races', explanation: 'When both sides have passed pawns racing to promote, count the moves! The side that promotes first (or promotes with check/tempo) usually wins. Every tempo matters.' },
        { title: 'Outside Passed Pawns', explanation: 'An outside passed pawn is far from the other pawns. It\'s valuable because the enemy king must chase it, leaving the other side of the board unguarded. Your king can then gobble up the remaining pawns.', fen: '8/6kp/5pp1/8/P7/8/5PPK/8 w - - 0 1', arrows: [{ from: 'a4', to: 'a8' }] },
        { title: 'The Decoy', explanation: 'The outside passed pawn acts as a decoy: the enemy king runs to stop it, and your king feasts on the abandoned pawns. This concept wins countless endgames.' },
        { title: 'Creating Passed Pawns', explanation: 'To create a passed pawn: advance your pawn majority, sacrifice a pawn to open the way, or use a pawn breakthrough. Having a passed pawn is a major advantage in any endgame.' },
      ],
    },
    {
      id: 'reti', name: 'The Reti Maneuver', description: 'The king pursues two goals at once.',
      steps: [
        { title: 'The Reti Study', explanation: 'A famous 1921 study by Richard Reti: White\'s king seems too far from both its own pawn and the enemy\'s pawn. But by moving diagonally, the king pursues both goals simultaneously!', fen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1' },
        { title: 'Diagonal Magic', explanation: 'The key insight: a king moving diagonally covers the same distance as moving in a straight line (because of how squares work). So moving toward BOTH targets at once is possible.' },
        { title: 'The Solution', explanation: 'Kg7! The king moves toward Black\'s h-pawn while also approaching its own c-pawn. Whether Black promotes first or stops the c-pawn, White\'s king accomplishes its second goal.' },
        { title: 'The Lesson', explanation: 'In king endgames, don\'t move your king toward just one goal. Look for diagonal paths that address multiple targets simultaneously. This principle saves many "lost" endgames.' },
      ],
    },
    {
      id: 'endgame-breakthroughs', name: 'Pawn Breakthroughs', description: 'Endgame pawn sacrifices to create passed pawns.',
      steps: [
        { title: 'Endgame Breakthroughs', explanation: 'Even with equal pawns, you can force a breakthrough by sacrificing one or more pawns to create an unstoppable passed pawn. Calculation and timing are critical.', fen: '8/ppp3k1/8/PPP3K1/8/8/8/8 w - - 0 1' },
        { title: 'The Classic 3v3', explanation: 'Pawns a5, b5, c5 vs a7, b7, c7. White plays b6! axb6 (or cxb6) then c6! (or a6!). One pawn gets through. This pattern is essential to recognize instantly.' },
        { title: 'Timing', explanation: 'Breakthroughs must be timed correctly. If your opponent\'s king is close enough to catch the pawn, the breakthrough fails. Calculate the square rule for the resulting passed pawn.' },
        { title: 'Defense', explanation: 'To defend against breakthroughs: keep your king near the pawns, don\'t let your opponent advance all their pawns to the 5th rank side by side, and create your own passed pawn threats.' },
      ],
    },
    {
      id: 'triangulation', name: 'Triangulation & Zugzwang', description: 'Losing a tempo to gain an advantage.',
      steps: [
        { title: 'Zugzwang', explanation: 'Zugzwang (German: "compulsion to move") is when ANY move worsens your position. In the endgame, being forced to move can be fatal \u2014 you\'d rather pass, but you can\'t!', fen: '8/8/8/2k1K3/8/2P5/8/8 b - - 0 1' },
        { title: 'Triangulation', explanation: 'How do you PUT your opponent in zugzwang? Triangulation: your king takes 3 moves to reach a square it could reach in 1, effectively "wasting" two moves and transferring the move to your opponent.' },
        { title: 'How It Works', explanation: 'Your king goes Kd4-Ke4-Kd3-Kd4, spending three moves to return to the same square. Your opponent\'s king only has direct moves, so they\'re now the one who must move. Zugzwang!' },
        { title: 'When to Use It', explanation: 'Triangulation works in king endgames when the position is mutual zugzwang \u2014 whoever moves loses. By triangulating, you force the opponent to be the one who must move. It\'s a beautiful technique.' },
      ],
    },
    {
      id: 'lucena', name: 'Lucena Position (Building a Bridge)', description: 'The most important rook endgame.',
      steps: [
        { title: 'The Lucena Position', explanation: 'The Lucena is THE most important rook endgame position. If you reach it, you win \u2014 guaranteed. The technique is called "building a bridge." Every serious player must know this.', fen: '1K1k4/1P6/8/8/8/8/5r2/4R3 w - - 0 1' },
        { title: 'The Problem', explanation: 'Your king is on b8, pawn on b7, rook on e1. The pawn can\'t promote because your own king blocks it. If Kc8, Rc2+ drives the king back. You need to clear the way while defending.' },
        { title: 'Building the Bridge', explanation: 'Step 1: Re4! (place the rook on the 4th rank). Step 2: Kc7, moving off the pawn. If Rc2+ comes, your rook blocks from e4: Kd6, Rd2+ Ke6, Re2+ Kf6, Rf2+ Ke5! and the rook on the 4th rank blocks all further checks!' },
        { title: 'The Key Concept', explanation: 'The rook on the 4th rank acts as a "bridge" \u2014 it blocks horizontal checks. Once the king crosses to the 5th rank, the opponent runs out of useful checks and the pawn promotes. Practice this until automatic!' },
      ],
    },
    {
      id: 'philidor', name: 'Philidor Position (3rd Rank Defense)', description: 'The drawing technique in rook endgames.',
      steps: [
        { title: 'The Philidor Position', explanation: 'If you\'re defending a pawn down in a rook endgame, the Philidor position is your lifeline. With correct defense, you hold a draw even a pawn down.', fen: '4k3/8/4r3/8/4P3/8/8/4RK2 b - - 0 1' },
        { title: 'The Technique', explanation: 'Place your rook on the 3rd rank (from your perspective), cutting off the enemy king. Wait passively as long as the pawn is on the 4th/5th rank. Don\'t let the enemy king advance!' },
        { title: 'When the Pawn Advances', explanation: 'Once the pawn reaches the 6th rank, switch to checking from behind (from the 1st or 2nd rank). The attacking king has no shelter from the checks, and the game is drawn.' },
        { title: 'The Critical Detail', explanation: 'The defense only works if your king is in front of or near the pawn. If your king is cut off on the side, you may lose even with correct technique. King position is critical!' },
      ],
    },
    {
      id: 'rook-activity', name: 'Rook Activity & Long Side/Short Side', description: 'Active rooks win endgames.',
      steps: [
        { title: 'Rook Activity', explanation: 'The #1 principle in rook endgames: rook activity trumps material. An active rook (attacking pawns, cutting off the king, on an open file) is worth more than an extra pawn with a passive rook.' },
        { title: 'Rooks Behind Passed Pawns', explanation: 'Place your rook BEHIND passed pawns (yours or your opponent\'s). Behind your pawn: the rook supports its advance. Behind their pawn: the rook attacks it and gains activity as the pawn advances.' },
        { title: 'Long Side Principle', explanation: 'In rook endgames with a side pawn (a or h file), the defending king goes to the SHORT side (closer to the pawn) and the defending rook checks from the LONG side (far away). More checking distance = more effective defense.' },
        { title: 'Practical Tips', explanation: 'Never put your rook in a passive position to "defend" a pawn. Trade passive defense for active counterplay. Cut off the enemy king with your rook. Activity, activity, activity!' },
      ],
    },
    {
      id: 'opposite-bishops', name: 'Opposite-Colored Bishops', description: 'The great equalizer.',
      steps: [
        { title: 'Opposite-Colored Bishops', explanation: 'When each side has a bishop and they\'re on different colors, the game has unique characteristics. These bishops can never interact (they\'re on different colored squares), creating paradoxical situations.' },
        { title: 'Drawing Tendencies', explanation: 'In the endgame, opposite-colored bishops favor the defender. Even two pawns down can be a draw, because the defender\'s bishop controls squares the attacker\'s bishop can\'t reach. The attacker can\'t make progress.' },
        { title: 'Attacking Potential', explanation: 'BUT in the middlegame, opposite-colored bishops favor the attacker! The attacking bishop controls squares the defender\'s bishop can\'t cover. It\'s like playing with an extra piece on attack.' },
        { title: 'Key Lesson', explanation: 'If you\'re ahead: avoid trading into opposite-colored bishop endgames (they\'re drawish). If you\'re behind: steer toward them for saving chances. This is one of the most practical endgame rules.' },
      ],
    },
    {
      id: 'wrong-rook-pawn', name: 'Wrong Rook Pawn', description: 'When a pawn on the edge can\'t win.',
      steps: [
        { title: 'The Problem', explanation: 'A rook pawn (a or h file) with a bishop of the WRONG color (doesn\'t control the promotion square) often can\'t win, even with an extra pawn. The defending king hides in the corner.', fen: '7k/8/6KP/8/2B5/8/8/8 w - - 0 1' },
        { title: 'Why It Draws', explanation: 'The pawn promotes on h8 (a dark square), but the bishop is light-squared. The defending king goes to h8 and can\'t be driven out, because the bishop can\'t attack dark squares.' },
        { title: 'When It Wins', explanation: 'If you have extra pieces or the defending king is far away, you might win anyway. But in pure bishop + rook pawn endgames, having the wrong bishop means a draw.' },
        { title: 'Practical Advice', explanation: 'When heading toward an endgame, consider which bishop you keep! Don\'t trade into a wrong-colored bishop + rook pawn ending. This knowledge saves points in tournament play.' },
      ],
    },
    {
      id: 'knight-endgames', name: 'Knight Endgames', description: 'Knights are tricky in the endgame.',
      steps: [
        { title: 'Knight Endgame Principles', explanation: 'Knight endgames resemble king and pawn endgames because knights are slow. The king must be active. Knights struggle with pawns on both sides of the board (they can\'t teleport like bishops).' },
        { title: 'Knight vs Passed Pawn', explanation: 'A knight can blockade a passed pawn by sitting on the square in front of it. From there, the knight is stable and controls other important squares. Blockading with a knight is very effective.' },
        { title: 'Knight Triangulation', explanation: 'Unlike kings, knights can\'t triangulate easily (they alternate colors each move). But knights can sometimes "waste" moves by making a longer circuit. This is advanced but useful in mutual zugzwang positions.' },
        { title: 'Practical Tips', explanation: 'In knight endgames: centralize your king, create passed pawns on one side, keep your knight centralized. Watch for forks and knight outposts \u2014 the knight\'s tactical tricks still apply in endgames.' },
      ],
    },
    {
      id: 'queen-vs-pawn', name: 'Queen vs Pawn on 7th', description: 'Can the queen stop the pawn?',
      steps: [
        { title: 'Queen vs Pawn on 7th Rank', explanation: 'A queen should beat a single pawn on the 7th rank \u2014 but it\'s not always easy! The technique involves checking the enemy king in front of the pawn, then approaching with your king.', fen: '8/1pk5/8/8/8/8/8/4K2Q w - - 0 1' },
        { title: 'The Exception: Bishop/Rook Pawns', explanation: 'Against a bishop pawn (c or f file) or rook pawn (a or h file) on the 7th, with the enemy king in front, stalemate tricks may draw! The defending king goes in front of the pawn and stalemating patterns appear.' },
        { title: 'Bishop Pawn Draw', explanation: 'With a c-pawn: Kc1 blocks the pawn, and after Qc2+ Kb1 or Kb2, there\'s no way to approach without allowing stalemate or the pawn promoting. This is an important drawing resource.' },
        { title: 'Center/Knight Pawn', explanation: 'Against d, e, b, or g pawns, the queen wins by checking the king away from the pawn\'s path, then approaching. Practice the technique of alternating checks and king approaches.' },
      ],
    },
    {
      id: 'two-bishops-mate', name: 'Two Bishops & Bishop+Knight Mates', description: 'Rare but essential mating techniques.',
      steps: [
        { title: 'Two Bishops Mate', explanation: 'K+B+B vs K is a forced win but requires precise technique. The bishops work together to push the king to a corner. It takes up to 19 moves from any position.', fen: '8/8/8/4k3/8/8/2BB4/4K3 w - - 0 1' },
        { title: 'Two Bishops Technique', explanation: 'Use the bishops to create a "wall" that pushes the king toward the edge, then into a corner. The key: place the bishops on adjacent diagonals, creating a barrier the king can\'t cross.' },
        { title: 'Bishop + Knight Mate', explanation: 'K+B+N vs K is the hardest basic checkmate. The king must be driven to the corner that matches the bishop\'s color. It requires up to 33 moves (dangerously close to the 50-move rule!).', fen: '8/8/8/4k3/8/8/1BN5/4K3 w - - 0 1' },
        { title: 'B+N Technique (W Method)', explanation: 'The "W maneuver": the knight traces a W-pattern to push the king from the wrong corner to the right corner. This is the trickiest basic endgame. Practice it \u2014 you may only need it once in a lifetime, but when you do, you must know it!' },
      ],
    },
    {
      id: 'practical-endgame', name: 'Practical Endgame Tips', description: 'Win more games with practical knowledge.',
      steps: [
        { title: 'Don\'t Rush', explanation: 'In endgames, patience wins. Improve your position gradually before committing to a plan. There\'s no clock pressure from the opponent\'s pieces, so take your time to optimize.' },
        { title: 'Passed Pawns Must Be Pushed', explanation: 'Nimzowitsch\'s rule: passed pawns must be pushed! But "pushed" doesn\'t mean recklessly. Support the passed pawn with your king and pieces first, then advance when the moment is right.' },
        { title: 'The Right Exchange', explanation: 'Trading into the right endgame is a skill. Trade pieces (not pawns) when ahead. Keep pawns on both sides of the board to create two weaknesses. And know your drawn vs won endgame positions.' },
        { title: 'Study Endgames!', explanation: 'Capablanca said: "To improve at chess, study the endgame first." Endgame knowledge gives you confidence in the middlegame \u2014 you know which simplifications win and which don\'t. It\'s the foundation of chess mastery.' },
      ],
    },
  ],
};

const advancedOpenings: AcademyCourse = {
  id: 'advanced-openings',
  name: 'Advanced Openings',
  description: 'Deep theory in the most popular tournament openings.',
  icon: '\u2694\uFE0F',
  color: '#ef4444',
  level: 'advanced',
  ratingRange: '1500-1800+',
  certificate: { name: 'Opening Theorist', icon: '\u2694\uFE0F' },
  lessons: [
    {
      id: 'najdorf', name: 'Sicilian Najdorf (5...a6)', description: 'The king of Sicilian variations.',
      steps: [
        { title: 'The Najdorf', explanation: 'The most popular and deeply analyzed Sicilian variation. Played by Fischer, Kasparov, and countless world champions. 5...a6 is flexible: it prepares ...e5, ...b5, or even ...e6 depending on White\'s response.' },
        { move: 'e4', title: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6', explanation: 'The Najdorf move! Black prevents Bb5 and prepares queenside expansion. White must choose between many systems: Be2, Bg5, Bc4, f3, Be3...', arrows: [{ from: 'a7', to: 'a6' }] },
        { title: 'Main Systems', explanation: '6.Be3 (English Attack) is the most critical. White castles queenside and attacks with f3, g4, h4. Black counterattacks on the queenside with ...b5 and in the center with ...e5 or ...d5.' },
        { title: 'Why Play It', explanation: 'The Najdorf gives Black unbalanced positions with winning chances. It requires deep preparation but rewards players who put in the work. It\'s the ultimate fighting weapon against 1.e4.' },
      ],
    },
    {
      id: 'dragon', name: 'Sicilian Dragon (5...g6)', description: 'The fiery fianchetto Sicilian.',
      steps: [
        { title: 'The Dragon', explanation: 'Black fianchettoes the bishop to g7, creating a "dragon" formation. The bishop on g7 breathes fire down the long diagonal. One of the sharpest openings in chess.' },
        { move: 'e4', title: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6', explanation: 'Black prepares ...Bg7. The dark-squared bishop will be the cornerstone of Black\'s position.', arrows: [{ from: 'g7', to: 'a1' }] },
        { title: 'The Yugoslav Attack', explanation: '6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 (or O-O-O). White castles queenside and storms the kingside with h4-h5. Black counterattacks on the queenside with ...Rc8, ...a5, ...b5. It\'s a race!' },
        { title: 'Dragon Character', explanation: 'The Dragon leads to mutual attacks on opposite sides. Both sides must be precise: one mistake can be fatal. It\'s not for the faint of heart but produces the most exciting chess.' },
      ],
    },
    {
      id: 'sveshnikov', name: 'Sicilian Sveshnikov (4...e5)', description: 'The modern dynamic Sicilian.',
      steps: [
        { title: 'The Sveshnikov', explanation: 'Black plays an early ...e5, accepting a backward d6 pawn and a hole on d5 in exchange for active piece play and the strong bishop on e7/g7. Popularized by Evgeny Sveshnikov.' },
        { title: 'Key Position', explanation: 'After 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5, White plays 6.Ndb5 d6. The knight eyes the d5 outpost, but Black has dynamic compensation.', fen: 'r1bqkb1r/pp3ppp/2np1n2/1N2p3/4P3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7' },
        { title: 'Black\'s Compensation', explanation: 'Black gets: active pieces, the f5 square for the knight, and the bishop pair if White plays Nd5 Nxd5 exd5 or Bxd5. The positions are complex but rich in ideas.' },
        { title: 'Modern Status', explanation: 'The Sveshnikov is one of the most respected Sicilians at the top level. Caruana, Carlsen, and many elite GMs have used it. It\'s theoretically demanding but strategically profound.' },
      ],
    },
    {
      id: 'berlin', name: 'Ruy Lopez Berlin (3...Nf6)', description: 'The Berlin Wall of chess.',
      steps: [
        { title: 'The Berlin Defense', explanation: 'After 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6, Black invites 4.O-O Nxe4 (the Berlin) or the Exchange with 4.Bxc6. The Berlin endgame (after queen exchange) is famous for its drawish but complex nature.' },
        { title: 'The Berlin Endgame', explanation: 'After 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8, queens are off and Black\'s king has lost castling rights. But the position is very solid for Black.', fen: 'r1bk1b1r/ppp2ppp/2p5/4Pn2/8/5N2/PPP2PPP/RNB2RK1 w - - 0 9' },
        { title: 'Why It Works', explanation: 'Kramnik used the Berlin to dethrone Kasparov in 2000. Despite the lack of queens and awkward king, Black\'s pawn structure is solid and the bishop pair provides long-term compensation.' },
        { title: 'Playing Against It', explanation: 'White can avoid the Berlin endgame with 4.d3 (Anti-Berlin) or sidestep it entirely. But playing into the endgame is also fine \u2014 White retains a slight edge with correct play.' },
      ],
    },
    {
      id: 'marshall', name: 'Ruy Lopez Marshall (8...d5)', description: 'The ultimate prepared sacrifice.',
      steps: [
        { title: 'The Marshall Attack', explanation: 'After 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3, Black plays the stunning 8...d5!? sacrificing a pawn for a fierce kingside attack.' },
        { title: 'The Sacrifice', explanation: '8...d5 9.exd5 Nxd5 10.Nxe5 Nxe5 11.Rxe5 c6. Black is a pawn down but has excellent piece activity, open lines, and a dangerous attack on the white king.', fen: 'r1bq1rk1/4bppp/p1p5/1p1nR3/8/1BP5/PP1P1PPP/RNBQ2K1 w - - 0 12' },
        { title: 'Why It Works', explanation: 'The Marshall has been analyzed for over 100 years and still stands as theoretically sound. Black\'s attack is real: ideas like ...Bd6, ...Qh4, ...Bg4, and ...Re8 create enormous pressure.' },
        { title: 'White\'s Options', explanation: 'Many strong players avoid the Marshall with 8.a4 (Anti-Marshall) or 8.h3. Facing the Marshall requires deep preparation. It\'s a testament to the power of a well-prepared gambit.' },
      ],
    },
    {
      id: 'tartakower', name: 'QGD Tartakower (7...b6)', description: 'A solid QGD system.',
      steps: [
        { title: 'The Tartakower', explanation: 'In the Queen\'s Gambit Declined, after 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 h6 7.Bh4, Black plays 7...b6 to fianchetto the problematic c8-bishop.' },
        { title: 'Solving the Bishop', explanation: 'The Tartakower solves the eternal QGD problem: how to develop the c8-bishop. After ...b6 and ...Bb7, the bishop is active on the long diagonal instead of being stuck behind the e6 pawn.' },
        { title: 'Modern Treatment', explanation: 'After 8.Be2 Bb7, Black has a solid setup. Plans include ...Nbd7, ...c5, and counterplay in the center. White maintains a slight space advantage but Black is very solid.' },
        { title: 'Why Play It', explanation: 'The Tartakower gives a reliable, easy-to-play position with few forced lines. It\'s a workhorse system used by world champions (Karpov, Kramnik) for decades.' },
      ],
    },
    {
      id: 'semi-slav', name: 'Semi-Slav: Meran & Moscow', description: 'Two sharp Semi-Slav systems.',
      steps: [
        { title: 'The Semi-Slav', explanation: 'After 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6, Black has a Semi-Slav structure. It\'s one of the richest openings in chess, with deeply analyzed variations.' },
        { title: 'Meran Variation', explanation: 'After 5.e3 Nbd7 6.Bd3 dxc4 7.Bxc4 b5, Black expands aggressively on the queenside. The Meran leads to sharp play with chances for both sides. Deeply theoretical.' },
        { title: 'Moscow Variation', explanation: 'After 5.Bg5 h6 6.Bxf6 (or Bh4), White trades the bishop for the knight to damage Black\'s structure. It\'s a more positional approach to the Semi-Slav.' },
        { title: 'Why the Semi-Slav?', explanation: 'The Semi-Slav combines the solidity of ...c6 (Slav) with the flexibility of ...e6 (QGD). It leads to the deepest theoretical duels in d4 openings. Anand, Kramnik, and Gelfand are experts.' },
      ],
    },
    {
      id: 'nimzo-indian', name: 'Nimzo-Indian (3...Bb4)', description: 'The elite defense to 1.d4.',
      steps: [
        { title: 'The Nimzo-Indian', explanation: 'After 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4, Black pins the knight and fights for e4 control. Named after Aron Nimzowitsch, it\'s one of the most respected openings in chess.' },
        { title: 'The Pin', explanation: 'By pinning the c3 knight, Black prevents White from easily establishing a full pawn center with e4. White must decide how to handle the pin: 4.Qc2, 4.e3, 4.f3, or 4.a3.', fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4', arrows: [{ from: 'b4', to: 'c3' }] },
        { title: 'Main Systems', explanation: '4.Qc2 (Classical) prevents doubled pawns. 4.e3 (Rubinstein) accepts them for piece activity. 4.f3 (Kmoch) aims for a big center. Each leads to different strategic themes.' },
        { title: 'Nimzo Character', explanation: 'The Nimzo gives Black flexible development and chances for counterplay. It avoids the heavy theory of the KID or QGD while maintaining fighting chances. Used by virtually every world champion.' },
      ],
    },
    {
      id: 'catalan', name: 'Catalan Opening (3.g3)', description: 'The sophisticated fianchetto system.',
      steps: [
        { title: 'The Catalan', explanation: 'After 1.d4 Nf6 2.c4 e6 3.g3, White fianchettoes the bishop to g2. The Catalan combines the queen\'s pawn opening with a King\'s Indian-style fianchetto. It\'s been a dominant weapon at the elite level.' },
        { title: 'The g2 Bishop', explanation: 'The bishop on g2 is powerful: it controls the long diagonal from a8 to h1, puts pressure on d5 and b7, and is hard to challenge. It\'s the soul of the Catalan.', arrows: [{ from: 'g2', to: 'a8' }] },
        { title: 'Open vs Closed Catalan', explanation: 'Open Catalan: Black takes c4, White recovers the pawn with the active g2 bishop. Closed Catalan: Black holds with ...d5, ...c6, creating a solid but slightly passive position.' },
        { title: 'Why It\'s Popular', explanation: 'The Catalan gives White a lasting positional edge with minimal risk. Kramnik, Giri, and many elite GMs have used it extensively. The positions require deep understanding but reward patient, technical play.' },
      ],
    },
    {
      id: 'kings-gambit', name: 'King\'s Gambit (2.f4)', description: 'The romantic attacking opening.',
      steps: [
        { title: 'The King\'s Gambit', explanation: 'After 1.e4 e5 2.f4, White sacrifices a pawn for rapid development and attacking chances. The oldest and most romantic gambit in chess, favored by Anderssen, Morphy, Spassky, and Fischer (who called it "a decisive opening").' },
        { title: 'Accepted: 2...exf4', explanation: 'Black takes the pawn. Now White plays 3.Nf3 (or 3.Bc4) and aims to open lines with d4. Black must be careful not to fall behind in development while holding the extra pawn.' },
        { title: 'Declined: 2...Bc5 or 2...d5', explanation: 'Black can decline with 2...Bc5 (Falkbeer-like positions) or 2...d5 (Falkbeer Counter-Gambit). These are solid alternatives that avoid White\'s attacking plans.' },
        { title: 'Modern Assessment', explanation: 'The King\'s Gambit isn\'t refuted but is rare at the top level. For club players, it\'s a fearsome weapon: most opponents don\'t know the theory. It teaches attacking chess and piece coordination.' },
      ],
    },
    {
      id: 'english-reti', name: 'English & Reti', description: 'Flexible flank openings.',
      steps: [
        { title: 'The English Opening (1.c4)', explanation: 'A flexible opening that can transpose into d4 systems or take independent paths. White fights for d5 control from the flank. It leads to strategic battles with less forcing theory.' },
        { title: 'Reversed Sicilian', explanation: '1.c4 e5 is the Reversed Sicilian \u2014 White plays a Sicilian with an extra tempo. It leads to rich positional play. White\'s plans include Nc3, g3, Bg2, and eventual d3+e4 or d4.' },
        { title: 'The Reti Opening (1.Nf3)', explanation: 'The ultimate flexible opening. 1.Nf3 can transpose to virtually any d4 or c4 system while avoiding many of Black\'s sharpest defenses. Reti used it to beat world champion Capablanca in 1924.' },
        { title: 'Hypermodern Ideas', explanation: 'Both the English and Reti embody hypermodern principles: control the center from the flanks, let Black overextend, then strike. They\'re excellent for players who prefer strategic complexity over memorization.' },
      ],
    },
    {
      id: 'grunfeld', name: 'Grunfeld Defense (3...d5)', description: 'Challenge the center dynamically.',
      steps: [
        { title: 'The Grunfeld', explanation: 'After 1.d4 Nf6 2.c4 g6 3.Nc3 d5! (not the KID\'s ...Bg7), Black immediately challenges White\'s center. It\'s one of the most theoretically demanding defenses, favored by Kasparov.' },
        { title: 'The Central Battle', explanation: 'After 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3, White has a strong center but Black has the bishop on g7 attacking it. The fight: can White hold the center or will Black demolish it?', fen: 'rnbqkb1r/ppp1pp1p/6p1/8/3PP3/2P5/P4PPP/R1BQKBNR b KQkq - 0 6' },
        { title: 'Black\'s Counterplay', explanation: 'Black plays ...c5, ...Bg7, ...Nc6/a5, and ...cxd4 to undermine White\'s center. If successful, White\'s extra center pawns become weaknesses. It\'s a dynamic give-and-take.' },
        { title: 'Modern Status', explanation: 'The Grunfeld is sound at the highest level. It requires significant memorization but rewards players with dynamic, unbalanced positions. Kasparov, MVL, and Grischuk are notable practitioners.' },
      ],
    },
    {
      id: 'anti-sicilians', name: 'Anti-Sicilians (Alapin, Grand Prix)', description: 'Avoid the Open Sicilian.',
      steps: [
        { title: 'Why Anti-Sicilians?', explanation: 'The Open Sicilian (2.Nf3 + 3.d4) is incredibly theoretical. Anti-Sicilians let White avoid those deep lines while maintaining winning chances. They\'re practical weapons.' },
        { title: 'Alapin (2.c3)', explanation: 'After 1.e4 c5 2.c3, White plans d4 next. It leads to straightforward positions where understanding outweighs memorization. White gets a comfortable IQP position or a strong center.' },
        { title: 'Grand Prix (2.Nc3 + f4)', explanation: 'White plays 2.Nc3 and 3.f4, aiming for a direct kingside attack. It\'s aggressive and easy to play. Black must know how to respond or face a dangerous assault.' },
        { title: 'Other Options', explanation: 'The Rossolimo (2.Nf3 Nc6 3.Bb5), Moscow (2.Nf3 d6 3.Bb5+), and Closed Sicilian (2.Nc3 + g3) are all viable. Choose the anti-Sicilian that fits your style and learn it well.' },
      ],
    },
    {
      id: 'repertoire-management', name: 'Repertoire Management', description: 'Maintain and evolve your opening knowledge.',
      steps: [
        { title: 'Organize Your Repertoire', explanation: 'Create a document or database of your key lines. For each opening, note: the main moves, critical alternatives, typical plans, and where you\'ve struggled. Review and update regularly.' },
        { title: 'Keep Current', explanation: 'Openings evolve! What was theory 5 years ago may be outdated. Follow strong players who use your openings. Check new developments in your key lines periodically.' },
        { title: 'Prepare for Opponents', explanation: 'Before serious games, check your opponent\'s opening preferences. Prepare surprise weapons or deeper analysis in critical lines they\'re likely to play.' },
        { title: 'Balance Depth and Breadth', explanation: 'Have a few deeply prepared lines (your main weapons) and broader knowledge of common positions. You don\'t need to know everything \u2014 but you need to know your lines cold.' },
      ],
    },
  ],
};

const mastery: AcademyCourse = {
  id: 'mastery',
  name: 'Mastery',
  description: 'Techniques and thinking methods used by masters and grandmasters.',
  icon: '\u{1F3C6}',
  color: '#ca8a04',
  level: 'master',
  ratingRange: '1800+',
  certificate: { name: 'Chess Master', icon: '\u{1F3C6}' },
  lessons: [
    {
      id: 'candidate-moves', name: 'Candidate Moves Method (Kotov)', description: 'Systematic calculation technique.',
      steps: [
        { title: 'The Kotov Method', explanation: 'Alexander Kotov\'s "Think Like a Grandmaster" introduced a systematic approach: (1) identify ALL candidate moves, (2) analyze each one ONCE to the end, (3) choose the best. No going back and forth!' },
        { title: 'Identifying Candidates', explanation: 'Look for: checks, captures, threats, pawn breaks, piece improvements. Generate 3-5 candidate moves for critical positions. Don\'t analyze the first move you see \u2014 generate alternatives first.' },
        { title: 'Disciplined Calculation', explanation: 'For each candidate, calculate the main line and one or two alternatives for your opponent. Reach a conclusion (better, worse, equal) and move to the next candidate. Compare all evaluations at the end.' },
        { title: 'Practical Adjustments', explanation: 'The pure Kotov method is idealized. In practice: (1) use intuition to order candidates (best first), (2) prune obviously bad lines quickly, (3) spend more time on critical positions, less on routine ones.' },
      ],
    },
    {
      id: 'visualization', name: 'Visualization Training', description: 'See positions moves ahead clearly.',
      steps: [
        { title: 'What Is Visualization?', explanation: 'The ability to clearly "see" a chess position several moves ahead without moving the pieces. This mental skill is what separates strong players from beginners. It can be trained!' },
        { title: 'Training Method 1: Blind Puzzles', explanation: 'Solve puzzles without looking at the board \u2014 just read the moves and visualize the position in your mind. Start with 2-move puzzles and gradually increase complexity.' },
        { title: 'Training Method 2: Replay Games', explanation: 'Take a master game in notation and replay it mentally, move by move. Try to visualize the position after each move before checking. This builds your mental board.' },
        { title: 'Progressive Training', explanation: 'Start by visualizing 1-2 moves ahead. As you improve, push to 3, 4, 5 moves. Most strong players can reliably visualize 4-6 moves ahead. World-class players see 10+.' },
      ],
    },
    {
      id: 'advanced-prophylaxis', name: 'Advanced Prophylaxis (Petrosian)', description: 'The art of prevention at the highest level.',
      steps: [
        { title: 'Petrosian\'s Legacy', explanation: 'Tigran Petrosian was the ultimate prophylactic player. He would prevent his opponent\'s ideas several moves in advance, creating positions where the opponent simply had no good plan.' },
        { title: 'Deep Prophylaxis', explanation: 'Beyond simple moves like h3, advanced prophylaxis involves: rerouting pieces to stop long-term plans, exchanging your opponent\'s key attacking piece, and creating structures that prevent pawn breaks.' },
        { title: 'The Exchange Sacrifice', explanation: 'Petrosian\'s trademark: sacrificing the exchange (Rook for minor piece) to neutralize the opponent\'s attacking potential. By removing a key piece, the opponent\'s entire plan collapses.' },
        { title: 'Thinking in Plans', explanation: 'At the master level, think in terms of your opponent\'s plans, not just their next move. "What does my opponent WANT to achieve in 5 moves?" Then prevent it today.' },
      ],
    },
    {
      id: 'complex-structures', name: 'Complex Structures: Hedgehog, Stonewall, Benoni', description: 'Master specific pawn formations.',
      steps: [
        { title: 'The Hedgehog', explanation: 'Black pawns on a6/b6/d6/e6 with pieces behind them. A spring-loaded position \u2014 Black absorbs pressure and waits to strike with ...b5 or ...d5 when White overextends. Patience and timing are everything.' },
        { title: 'The Stonewall', explanation: 'Pawns on c3/d4/e3/f4 (or ...c6/d5/e6/f5 for Black). The Stonewall creates a rigid center. The strong side aims to use the outpost on e5 (or e4) and attack on the kingside. The weak point: the dark squares.' },
        { title: 'The Benoni', explanation: 'After 1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5, Black has a mobile queenside majority and the c5 pawn controls d4. White has a passed d-pawn and space. Dynamic, sharp play!' },
        { title: 'Structure Dictates Plans', explanation: 'Knowing these structures means you always have a plan. See a Hedgehog? Wait and break. See a Stonewall? Use the outpost. See a Benoni? Race with your pawn majority. Structure knowledge is strategic power.' },
      ],
    },
    {
      id: 'exchange-sacrifice', name: 'The Exchange Sacrifice', description: 'Giving up a rook for a minor piece intentionally.',
      steps: [
        { title: 'When to Sacrifice the Exchange', explanation: 'The exchange sacrifice (Rook for Bishop/Knight) is correct when: (1) you get a strong minor piece (outpost knight, dominant bishop), (2) you wreck the opponent\'s structure, (3) you gain a lasting initiative.' },
        { title: 'Positional Exchange Sacrifice', explanation: 'Petrosian\'s specialty: sacrifice the exchange not for a tactical trick, but for lasting positional gains. A knight on d5 or a bishop pair with no counter-play can outweigh a rook.' },
        { title: 'Tactical Exchange Sacrifice', explanation: 'Sometimes Rxc3 or Rxe5 destroys the opponent\'s pawn structure, exposes the king, or creates unstoppable passed pawns. The rook\'s value drops when the position becomes closed.' },
        { title: 'Evaluating the Compensation', explanation: 'After an exchange sacrifice, evaluate: piece activity, pawn structure, king safety, initiative. If you score well on 2-3 of these, the sacrifice is likely sound. Trust positional compensation.' },
      ],
    },
    {
      id: 'coordination', name: 'Piece Coordination & Harmony', description: 'Making all your pieces work together.',
      steps: [
        { title: 'What Is Coordination?', explanation: 'Coordination means your pieces work together harmoniously, supporting each other and controlling complementary squares. A coordinated army is far stronger than pieces working independently.' },
        { title: 'Rook + Knight', explanation: 'Rooks and knights coordinate well in closed positions. The knight holds outposts while the rook controls open files. They cover each other\'s weaknesses (the knight\'s lack of range, the rook\'s need for open lines).' },
        { title: 'Bishop + Queen Battery', explanation: 'A queen and bishop on the same diagonal create a powerful battery. The bishop "aims" and the queen delivers firepower. This is one of the most dangerous attacking configurations.' },
        { title: 'Disrupting Coordination', explanation: 'Break your opponent\'s coordination! Trade their well-placed pieces, force pieces to awkward squares, and create disconnection between their army. A discoordinated army is vulnerable to tactics.' },
      ],
    },
    {
      id: 'dynamic-static', name: 'Dynamic vs Static Advantages', description: 'Understanding the nature of your advantage.',
      steps: [
        { title: 'Static Advantages', explanation: 'Static advantages are lasting: better pawn structure, bishop pair, outposts, space advantage. They persist regardless of whose turn it is. You can play patiently and the advantage remains.' },
        { title: 'Dynamic Advantages', explanation: 'Dynamic advantages are temporary: development lead, initiative, attacking chances, piece activity. These must be converted quickly before the opponent stabilizes. If you wait, they evaporate.' },
        { title: 'Converting Advantages', explanation: 'Static advantage: don\'t rush. Improve your position gradually, trade pieces to simplify, head for a favorable endgame. Dynamic advantage: act now! Attack, sacrifice, create concrete threats before time runs out.' },
        { title: 'The Key Question', explanation: 'After each game evaluation, ask: "Is my advantage static or dynamic?" This determines your entire approach. Misidentifying the nature of your advantage leads to poor plans and missed opportunities.' },
      ],
    },
    {
      id: 'complex-rook-endgames', name: 'Complex Rook Endgames', description: 'Advanced rook endgame technique.',
      steps: [
        { title: 'Rook Endgame Complexity', explanation: 'Rook endgames are the most common and most complex endgames. They\'re drawn more often than other endgames because rooks are so active. Understanding key positions is critical for competitive play.' },
        { title: 'Rook + 2 Pawns vs Rook + 1', explanation: 'Usually winning, but the defender has drawing chances if: pawns are on the same side, the defending rook is active, or the pawns are doubled. Connected passed pawns on different files are usually decisive.' },
        { title: 'Rook + Pawn vs Rook', explanation: 'Know the Lucena (winning) and Philidor (drawing). Also study: Vancura position (drawing with a-pawn), Cochrane defense (checking from the side), and short-side/long-side principles.' },
        { title: 'Advanced Technique', explanation: 'In complex rook endgames: (1) always keep your rook active, (2) place rooks behind passed pawns, (3) cut off the enemy king, (4) don\'t hurry \u2014 improve your position before pushing pawns.' },
      ],
    },
    {
      id: 'queen-endgames', name: 'Queen Endgames', description: 'The trickiest endgame type.',
      steps: [
        { title: 'Queen Endgame Character', explanation: 'Queen endgames are extremely tricky. Perpetual check threats are everywhere, so winning advantages are often smaller than expected. Centralized kings and passed pawns are especially important.' },
        { title: 'Perpetual Check Danger', explanation: 'The losing side should always look for perpetual check. Queens can check from many angles, and saving a draw from a lost position via perpetual is common. Always calculate if your opponent can force perpetual.' },
        { title: 'Queen + Pawn vs Queen', explanation: 'Generally winning if the pawn is advanced, but perpetual check dangers are real. The winning technique: use your king to block checks while advancing the pawn. Very difficult in practice.' },
        { title: 'Practical Tips', explanation: 'In queen endgames: keep your king safe from perpetual, centralize your queen, create passed pawns, and calculate carefully. One wrong move can turn a win into a draw (or vice versa).' },
      ],
    },
    {
      id: 'master-games', name: 'Master Games: Morphy to Carlsen', description: 'Learn from the greatest players in history.',
      steps: [
        { title: 'Paul Morphy (1837-1884)', explanation: 'The first unofficial world champion. Morphy demonstrated the power of rapid development and open lines. His games are still the best way to learn attacking chess. Study his Opera Game!' },
        { title: 'Capablanca & Fischer', explanation: 'Capablanca (champion 1921-1927) played with crystal-clear simplicity. Fischer (champion 1972) combined deep preparation with practical strength. Both showed that chess can be played with precision AND brilliance.' },
        { title: 'Karpov & Kasparov', explanation: 'Karpov (champion 1975-1985): the master of prophylaxis, small advantages, and technical endgames. Kasparov (champion 1985-2000): the greatest dynamic player, deep preparation, and fierce will to win.' },
        { title: 'The Modern Era', explanation: 'Carlsen (champion 2013-2023): universal style, grinds opponents in endgames. Today\'s elite are influenced by engine preparation. Study classical games for ideas, modern games for theory.' },
      ],
    },
    {
      id: 'time-pressure', name: 'Time Pressure Decisions', description: 'Play well when the clock is ticking.',
      steps: [
        { title: 'Time Management', explanation: 'Allocate time wisely: spend more time on critical moments (opening preparation breaks, sharp tactics, key decisions) and less on routine moves. Don\'t use too much time early.' },
        { title: 'Decision-Making Under Pressure', explanation: 'When short on time: (1) trust your instincts, (2) play forcing moves (they\'re easier to calculate), (3) avoid complex positions, (4) make your moves confidently. Hesitation wastes precious seconds.' },
        { title: 'Using Your Opponent\'s Time', explanation: 'Think on your opponent\'s time! When they\'re thinking, plan your response. Most of your thinking should happen during their clock time, not yours.' },
        { title: 'Increment vs No Increment', explanation: 'With increment (e.g., +10 seconds per move), you can survive time pressure by making quick moves. Without increment, build a time cushion early. Always know how much time you have left.' },
      ],
    },
    {
      id: 'tournament-prep', name: 'Tournament Preparation', description: 'Get ready for competitive chess.',
      steps: [
        { title: 'Opening Preparation', explanation: 'Before a tournament: review your main lines, prepare one or two surprise weapons, study your likely opponents\' opening preferences. Don\'t learn new openings right before \u2014 refine what you know.' },
        { title: 'Physical Preparation', explanation: 'Chess is mentally exhausting. Sleep well, eat properly, exercise, and stay hydrated. Kasparov ran and swam to maintain his stamina for 5-hour games. Your body supports your brain.' },
        { title: 'Mental Approach', explanation: 'Set realistic goals. Focus on playing good chess, not just results. Analyze games between rounds but don\'t obsess over losses. Stay positive and trust your preparation.' },
        { title: 'Practical Tips', explanation: 'Arrive early to settle in. Bring snacks and water. Have a pre-game routine. Know the time control and rules. And most importantly: enjoy the competition! Tournament chess is a unique challenge.' },
      ],
    },
    {
      id: 'analyzing-games', name: 'Analyzing Your Games', description: 'The fastest path to improvement.',
      steps: [
        { title: 'Why Analyze?', explanation: 'Analyzing your own games is the single fastest way to improve. You discover your weaknesses, reinforce your strengths, and learn from your mistakes in context. No book can replace this.' },
        { title: 'How to Analyze', explanation: 'Step 1: Go through the game WITHOUT an engine. Note where you were unsure, where you think you went wrong, and critical moments. Step 2: Use an engine to check your analysis. Step 3: Record what you learned.' },
        { title: 'What to Look For', explanation: 'Opening errors: where did you leave preparation? Tactical oversights: what did you miss? Strategic mistakes: was your plan correct? Time management: did you spend time wisely? Endgame technique: could you have converted better?' },
        { title: 'Building a Habit', explanation: 'Analyze every serious game you play. Keep a notebook of lessons learned. Review it periodically. Over time, you\'ll build a personal library of chess wisdom tailored exactly to your game.' },
      ],
    },
    {
      id: 'path-to-expert', name: 'The Path to Expert', description: 'A roadmap for continued improvement.',
      steps: [
        { title: 'Where You Are', explanation: 'If you\'ve completed the Chess Academy, you have a solid foundation: fundamentals, tactics, openings, strategy, endgames, and advanced concepts. You\'re equipped for competitive tournament play.' },
        { title: 'Balanced Training', explanation: 'Continue improving with a balanced regimen: (1) solve tactics daily (15-30 min), (2) play serious games (at least 2-3 per week), (3) study master games, (4) analyze your own games, (5) study endgames.' },
        { title: 'Find Your Weaknesses', explanation: 'Your games will tell you what to study. Losing in the endgame? Study endgames. Missing tactics? Solve harder puzzles. Lost in the opening? Study your specific lines deeper. Be honest about weaknesses.' },
        { title: 'The Journey Continues', explanation: 'Chess mastery is a lifelong pursuit. Every game teaches something new. Enjoy the process, celebrate progress, and remember: even world champions are still learning. The path to mastery is the game itself.' },
      ],
    },
  ],
};

export const ACADEMY_COURSES: AcademyCourse[] = [
  fundamentals,
  basicTactics,
  openingRepertoire,
  intermediateTactics,
  positionalChess,
  endgameEssentials,
  advancedOpenings,
  mastery,
];

export function getCourse(courseId: string): AcademyCourse | undefined {
  return ACADEMY_COURSES.find((c) => c.id === courseId);
}

export function getLesson(courseId: string, lessonId: string): AcademyLesson | undefined {
  return getCourse(courseId)?.lessons.find((l) => l.id === lessonId);
}

export function getNextLesson(courseId: string, lessonId: string): { courseId: string; lessonId: string } | null {
  const course = getCourse(courseId);
  if (!course) return null;
  const idx = course.lessons.findIndex((l) => l.id === lessonId);
  if (idx < course.lessons.length - 1) {
    return { courseId, lessonId: course.lessons[idx + 1].id };
  }
  // Move to next course
  const courseIdx = ACADEMY_COURSES.findIndex((c) => c.id === courseId);
  if (courseIdx < ACADEMY_COURSES.length - 1) {
    const nextCourse = ACADEMY_COURSES[courseIdx + 1];
    if (nextCourse.lessons.length > 0) {
      return { courseId: nextCourse.id, lessonId: nextCourse.lessons[0].id };
    }
  }
  return null;
}
