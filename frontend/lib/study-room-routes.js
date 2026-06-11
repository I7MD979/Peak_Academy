/** Study room paths scoped to the current role area (student vs teacher). */

export function isTeacherStudyRoomArea(pathname = "") {
  return String(pathname).startsWith("/teacher/study-rooms");
}

export function studyRoomsListPath(pathname = "") {
  return isTeacherStudyRoomArea(pathname) ? "/teacher/study-rooms" : "/student/study-rooms";
}

export function studyRoomDetailPath(roomId, pathname = "", query = {}) {
  const base = studyRoomsListPath(pathname);
  const url = `${base}/${roomId}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export function studyRoomVoicePath(roomId, pathname = "", voiceQuery = {}) {
  const base = studyRoomsListPath(pathname);
  const params = new URLSearchParams(voiceQuery);
  const qs = params.toString();
  return qs ? `${base}/${roomId}/voice?${qs}` : `${base}/${roomId}/voice`;
}
