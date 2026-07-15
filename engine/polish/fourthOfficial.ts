// Step 60 — Fourth official (added time board + sub announcements).

export type FourthOfficialBoard = {
  addedMinutes: number | null;
  message: string | null;
  subAnnounced: boolean;
};

export type FourthOfficialState = {
  board: FourthOfficialBoard;
};

export const createFourthOfficial = (): FourthOfficialState => ({
  board: { addedMinutes: null, message: null, subAnnounced: false },
});

export const showAddedTime = (
  _state: FourthOfficialState,
  minutes: number,
): FourthOfficialState => ({
  board: {
    addedMinutes: minutes,
    message: `+${minutes}`,
    subAnnounced: false,
  },
});

export const announceSub = (
  state: FourthOfficialState,
  text: string,
): FourthOfficialState => ({
  board: {
    addedMinutes: state.board.addedMinutes,
    message: text,
    subAnnounced: true,
  },
});

export const clearFourthBoard = (
  state: FourthOfficialState,
): FourthOfficialState => ({
  board: {
    addedMinutes: state.board.addedMinutes,
    message: null,
    subAnnounced: false,
  },
});
