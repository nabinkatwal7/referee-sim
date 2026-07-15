// Step 60 — Dynamic commentary.

export type CommentaryLine = {
  text: string;
  at: number;
  ttl: number;
};

const LINES: Record<string, string[]> = {
  goal: [
    "It's in the back of the net!",
    "They've found the breakthrough!",
    "Clinical finish — the crowd erupts!",
    "The goal is in the net!",
    "An absolute rocket into the top corner! Unstoppable!",
    "Goaaal! They've torn the defense apart!",
    "A moment of pure magic! Class written all over it.",
    "He makes no mistake from there! Simply sublime.",
    "The deadlock is broken, and the stadium is rocking!",
    "Cue the pandemonium! What a sensational strike!",
    "Goodness me, what a hit! He's caught that absolutely perfectly!",
    "The keeper stood absolutely no chance with that one.",
    "Talk about an instant impact! Drama written all over it!",
    "He’s picked his spot beautifully. Just pure technical perfection.",
    "They’ve been knocking on the door, and it has finally flown open!",
    "A catastrophic error at the back, and they've been punished instantly!",
    "He steers it home! A poacher's goal of the highest order.",
  ],
  foul: [
    "That's a robust challenge…",
    "The referee has something to look at here.",
    "Late? Late-ish. Decision pending.",
    "A reckless lunge there, he's lucky to escape serious trouble.",
    "No whistle? The crowd certainly thought that was a foul.",
    "He's completely missed the ball and taken the man.",
    "A bit of agricultural defending there, to say the least.",
    "That's going to draw a stern lecture from the official.",
    "Tempers flaring slightly after that clumsy collision.",
    "He's gone in with studs showing there. Dangerous territory.",
    "An cynical interception to stop the counter-attack.",
    "He’s checked his run there—definitely caught him with an elbow.",
    "The referee plays advantage, but he's coming back for that one.",
    "A textbook professional foul, he knew exactly what he was doing.",
  ],
  card: [
    "Out comes the card!",
    "Discipline applied.",
    "He won't like that booking.",
    "The referee goes straight to his pocket. No arguments there.",
    "A yellow card issued, and he'll have to walk a tightrope now.",
    "That's his final warning translated into color.",
    "The color is yellow, and the defender can have no complaints.",
    "Brandished without hesitation! The referee is taking control.",
    "Oh, it's a red! He's off! A moment of absolute madness!",
    "Early bath for him. That's a massive blow for his team.",
    "He's already on a yellow... and yes, he's seen the second one! Sent off!",
    "The card is out, and it's fully deserved after a sequence of persistent infringement.",
  ],
  shot: [
    "Attempt on goal!",
    "They've got a sight of goal.",
    "Strike!",
    "The ball is on target!",
    "He unloads from distance! Whizzed just over the bar.",
    "A stinging effort! The keeper had to be alert there.",
    "Tries his luck from range, but it lacks the accuracy.",
    "Strikes it on the volley! So close to a spectacular goal.",
    "A speculative effort, but you've got to buy a ticket to win the lottery.",
    "He had options left and right, but decided to go alone!",
    "Fired low towards the bottom corner, but it's just wide of the post.",
    "He’s completely snatched at that one. Into row Z it goes.",
    "A brilliant fingertip save tips it over the woodwork!",
    "Brilliant block! The defender threw his body on the line.",
  ],
  pass: [
    "Neat interchange.",
    "Looking for the runner.",
    "Patient build-up.",
    "The ball is in the air!",
    "Threading the needle with a beautiful through ball.",
    "A crisp, diagonal switch to open up the pitch.",
    "Pinging it around with absolute confidence right now.",
    "A delicate chip over the top, but the defense recovers.",
    "Spreading the play wide, trying to stretch this compact block.",
    "A cheeky backheel keeps the move alive.",
    "They are passing them into submission at the moment.",
    "A wayward ball cuts that promising attacking move short.",
    "One-touch football at its absolute finest.",
    "A completely blind pass, but it finds its target perfectly.",
  ],
  rain: [
    "The pitch is slick now.",
    "Weather becoming a factor.",
    "The rain is falling.",
    "It's absolutely pouring down out there, ball handling will be tricky.",
    "The surface is getting lightning fast with this downpour.",
    "Skidding off the turf—players will need to adjust their passing weight.",
    "Conditions deteriorating as the heavens open up.",
    "The ground staff will be worried about waterlogging if this keeps up.",
    "It's a classic miserable afternoon, but perfect for a sliding tackle.",
    "Players are slipping all over the shop; boots are struggling for grip.",
  ],
  protest: [
    "They're surrounding the referee!",
    "Strong words directed at the official.",
    "The players are not happy with the decision.",
    "The players are protesting the decision.",
    "The captain is leading the furious appeals here.",
    "The referee is waving them away, but the discontent is deafening.",
    "Absolute outrage from the technical bench as well.",
    "They feel completely aggrieved by that call.",
    "He's gesturing wildly, demanding a review of that decision.",
    "The fans are adding their vocal support to the players' complaints.",
    "The referee is threatening to book the captain if they don't disperse.",
  ],
  injury: [
    "He's down — looks hurt.",
    "Medical attention needed.",
    "The players are concerned about the player's injury.",
    "The player is receiving medical attention.",
    "That looked like a nasty twist. The magic sponge might not fix this.",
    "Play stops immediately as the physios rush onto the pitch.",
    "Holding his hamstring... that's never a good sign.",
    "He's trying to shake it off, but he looks in significant discomfort.",
    "The stretcher is being brought out. This looks quite serious.",
    "He’s walking off under his own power, but looks incredibly disappointed.",
    "A clash of heads has left both players grounded.",
  ],
  sub: [
    "Change on the way.",
    "Fresh legs entering the fray.",
    "A tactical shake-up from the manager. Let's see how this adjusts the shape.",
    "The board goes up, a substitution is imminent.",
    "He's run his socks off today, off he comes to a standing ovation.",
    "Bringing on some extra firepower to chase this result.",
    "A defensive reinforcement to park the bus for the final whistle.",
    "The manager is rolling the dice with a double switch here.",
    "Straight swap in the midfield to keep the energy levels high.",
  ],
  waste: [
    "They're taking their time here…",
    "Clock management from the restart.",
    "The players are wasting time.",
    "The clock is ticking.",
    "An agonizingly slow walk to take this throw-in.",
    "The keeper is practically turning into a statue before kicking that.",
    "Classic gamesmanship on display now, standard anti-football.",
    "The referee is tapping his watch, warning them to get on with it.",
    "They've gone to the corner flag to shield the ball. Killing time.",
    "A very slow recovery from that tackle to eat up a few more seconds.",
    "The crowd is getting incredibly frustrated with these delay tactics.",
  ],
  kickoff: [
    "And we're underway.",
    "Kickoff — here we go.",
    "The game is underway!",
    "The referee blows the whistle, and the tactical battle begins.",
    "First half starts now. Let's see who imposes their will first.",
    "The talking stops, the action begins!",
    "We are live for what promises to be an absolute blockbuster.",
    "A roaring atmosphere welcomes the players as we kick off.",
  ],
  default: [
    "The game flows on.",
    "Still everything to play for.",
    "The game is in progress!",
    "The game is flowing on.",
    "The game is progressing.",
    "Both sides just jostling for superiority in the middle third.",
    "A cagey affair at the moment, waiting for someone to blink.",
    "End-to-end stuff, though neither side has carved out a clear opening.",
    "The intensity is high, but the final ball is just lacking.",
    "The midfield battle is absolutely fierce right now.",
    "A lull in the action as both teams look to reset their shapes.",
    "Possession changing hands rapidly; nobody can keep a hold of it.",
    "A highly technical display, but desperately lacking in final product.",
  ],
};

const pick = (kind: string): string => {
  const pool = LINES[kind] ?? LINES.default;
  return pool[Math.floor(Math.random() * pool.length)]!;
};

export type CommentaryState = {
  current: CommentaryLine | null;
  history: string[];
};

export const createCommentary = (): CommentaryState => ({
  current: null,
  history: [],
});

export const pushCommentary = (
  state: CommentaryState,
  kind: string,
  at: number,
): CommentaryState => {
  const text = pick(kind);
  const current = { text, at, ttl: 4.5 };
  const history = [text, ...state.history].slice(0, 12);
  return { current, history };
};

export const stepCommentary = (
  state: CommentaryState,
  delta: number,
): CommentaryState => {
  if (!state.current) return state;
  const ttl = state.current.ttl - delta;
  if (ttl <= 0) return { ...state, current: null };
  return { ...state, current: { ...state.current, ttl } };
};
