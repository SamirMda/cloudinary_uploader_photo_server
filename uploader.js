require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function cleanName(input) {
  return input
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

/**
 * Recursively get all image file paths
 * @param dir
 * @param root
 * @returns {*[]}
 */
function getAllImagesPaths(dir, root = dir) {
    let results = [];
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const  stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(getAllImagesPaths(fullPath, root));
        } else if (/\.(jpg|jpeg|png|webp|gif)$/i.test(file)) {
            results.push({
                localPath: fullPath,
                relativePath: path.relative(root, fullPath),
            });
        }

    })

    return results;
}

/**
 * Upload images and generate CSV
 * @returns {Promise<void>}
 */
async function uploadAllImages() {
    const localFolder = './Photos-Halal-Québec';
    const cloudinaryRootFolder = 'halal_quebec';
    const csvRows = [];
    const skippedImages = [];

    const images = getAllImagesPaths(localFolder);

    for (const image of images) {
        const { localPath, relativePath } = image;
        const parsed = path.parse(relativePath);

        const cleanSubFolder = parsed.dir
            .split(path.sep)
            .map(cleanName)
            .join('/');

        const cleanedFilename = cleanName(parsed.name);
        const brand = cleanSubFolder.split('/').pop(); // last subfolder = brand

        // Filter: upload only if filename includes the brand
        if(!cleanedFilename.includes(brand)) {
            const reason = `Skipped: ${relativePath} (doas not contain brand "${brand}")`;
            console.log(reason);
            skippedImages.push(reason);
            continue;
        }

        const cloudinaryFolder = path.posix.join(cloudinaryRootFolder, cleanSubFolder);

        try {
            const result = await cloudinary.uploader.upload(localPath, {
                folder: cloudinaryFolder,
                public_id: cleanedFilename,
                overwrite: true,
            });

            csvRows.push({
                brand,
                description: cleanedFilename,
                image: result.secure_url,
            });

            console.log(`Uploaded ${result.secure_url}`);
        } catch (error) {
            console.error(`Error with ${relativePath} :`, error.message);
        }
    }

    // Write CSV
    const csvWriter = createObjectCsvWriter({
        path: 'halal_quebec_images.csv',
        header: [
            {id: 'brand', title: 'Brand'},
            {id: 'description', title: 'Description'},
            {id: 'image', title: 'Image'},
        ],
    });

    await csvWriter.writeRecords(csvRows);
    console.log('CSV saved: halal_quebec_images.csv');

    // Write skipped log
    if (skippedImages.length > 0) {
        fs.writeFileSync('skipped_images.txt', skippedImages.join('\n'), 'utf8');
        console.log('Skipped images written to skipped_images.txt');
    } else {
        console.log('No images skipped');
    }
}

uploadAllImages();