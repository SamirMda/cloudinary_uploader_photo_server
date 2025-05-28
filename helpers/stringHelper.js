/**
 * Delete and replace space and special character
 * by '_'
 * @param rawName
 * @returns {string}
 */
function cleanName(rawName) {
  return rawName
    .replace(/œ/g, 'oe')                          // Replace ligature œ
    .normalize('NFD')                             // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')              // Remove diacritics (accents)
    .replace(/['",\/\\()]/g, '_')                 // Replace ', ", /, \, (, ) with _
    .replace(/\s+/g, '_')                         // Replace spaces with _
    .replace(/[^a-zA-Z0-9_-]/g, '')               // Remove any remaining special chars
    .replace(/_+/g, '_')                          // Collapse multiple underscores
    .replace(/^_+|_+$/g, '')                      // Trim underscores at start/end
    .toLowerCase();                               // Optional: enforce lowercase
}

module.exports = {cleanName}