const axios = require('axios');
const { KeyRotator } = require('../utils/apiKeyManager');

const youtubeRotator = new KeyRotator('YouTube', 'YOUTUBE_API_KEYS', 'YOUTUBE_API_KEY');
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube Data API v3 for videos matching a given query.
 * Keys are read from environment variables and automatically rotated if quota limit is reached.
 * 
 * @param {string} query - Search query string
 * @param {number} maxResults - Max number of results to return (default: 3)
 * @returns {Array} Array of video result objects
 */
async function searchYouTubeVideos(query, maxResults = 3) {
  return youtubeRotator.execute(async (apiKey) => {
    try {
      const response = await axios.get(`${YOUTUBE_BASE_URL}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults,
          relevanceLanguage: 'en',
          safeSearch: 'moderate',
          key: apiKey,
        },
      });

      const items = response.data.items || [];

      return items.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));
    } catch (err) {
      // If YouTube API quota exceeded or key invalid, throw descriptive error
      const apiError = err.response?.data?.error;
      if (apiError) {
        throw new Error(`YouTube API error ${apiError.code}: ${apiError.message}`);
      }
      throw new Error(`YouTube API request failed: ${err.message}`);
    }
  });
}

/**
 * Fetch videos for multiple modules in parallel.
 * @param {Array} modules - Array of { moduleTitle, searchQuery, order }
 * @returns {Array} Array of { moduleTitle, order, results }
 */
async function fetchVideosForModules(modules) {
  const results = await Promise.allSettled(
    modules.map(async (mod) => {
      const searchQuery = mod.searchQuery || mod.title;
      const videos = await searchYouTubeVideos(searchQuery, 3);
      return {
        moduleOrder: mod.order,
        moduleTitle: mod.title,
        results: videos,
      };
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.warn(`YouTube search failed for module ${i + 1}: ${r.reason.message}`);
    return {
      moduleOrder: modules[i].order,
      moduleTitle: modules[i].title,
      results: [],
    };
  });
}

module.exports = { searchYouTubeVideos, fetchVideosForModules };

