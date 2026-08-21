export function pickShowcaseAvatars(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  return {
    main: safeItems[0]?.thumb || safeItems[0]?.image || null,
    back: safeItems[1]?.thumb || safeItems[1]?.image || null,
    front: safeItems[2]?.thumb || safeItems[2]?.image || null,
  };
}
