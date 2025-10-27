const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Country = require('../Models/Countries');
const Status = require('../Models/Status');

const CACHE_DIR = path.join(__dirname, '..', 'cache');
const IMAGE_PATH = path.join(CACHE_DIR, 'summary.png');

const generateSummaryImage = async () => {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const status = await Status.findOne({});
    const top5Countries = await Country.find({ estimated_gdp: { $ne: null } })
      .sort({ estimated_gdp: -1 })
      .limit(5)
      .select('name estimated_gdp');

    const totalCountries = status ? status.total_countries : 0;
    const lastRefreshed = status ? status.last_refreshed_at.toLocaleString() : 'N/A';

    let top5Text = '';
    if (top5Countries.length > 0) {
      top5Text = top5Countries.map((country, index) => {
        const gdp = country.estimated_gdp ? country.estimated_gdp.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A';
        return `${index + 1}. ${country.name}: $${gdp}`;
      }).join('\n');
    } else {
      top5Text = 'No countries with estimated GDP available.';
    }

    const svgWidth = 600;
    const svgHeight = 400;
    const fontSize = 18;
    const lineHeight = fontSize * 1.5;
    let currentY = 40;

    let svgContent = `
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="100%" height="100%" fill="#f0f0f0"/>
        <text x="20" y="${currentY}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333">Country Data Summary</text>
    `;
    currentY += lineHeight * 2;

    svgContent += `
        <text x="20" y="${currentY}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#555">Total Countries: ${totalCountries}</text>
    `;
    currentY += lineHeight;

    svgContent += `
        <text x="20" y="${currentY}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#555">Last Refreshed: ${lastRefreshed}</text>
    `;
    currentY += lineHeight * 2;

    svgContent += `
        <text x="20" y="${currentY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#333">Top 5 Countries by Estimated GDP:</text>
    `;
    currentY += lineHeight;

    top5Text.split('\n').forEach(line => {
      svgContent += `<text x="40" y="${currentY}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#666">${line}</text>`;
      currentY += lineHeight;
    });

    svgContent += `</svg>`;

    await sharp(Buffer.from(svgContent))
      .png()
      .toFile(IMAGE_PATH);

    console.log('Summary image generated successfully at:', IMAGE_PATH);
  } catch (error) {
    console.error('Error generating summary image:', error);
  }
};

module.exports = {
  generateSummaryImage,
  IMAGE_PATH, 
};