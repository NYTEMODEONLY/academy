const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  // Passthrough copies
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });

  // Collections
  eleventyConfig.addCollection("courses", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/courses/*.md")
      .sort((a, b) => a.data.order - b.data.order);
  });

  eleventyConfig.addCollection("lessons", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/lessons/**/*.md")
      .sort((a, b) => a.data.order - b.data.order);
  });

  eleventyConfig.addCollection("news", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/news/*.md")
      .sort((a, b) => b.data.date - a.data.date);
  });

  // Filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("MMMM d, yyyy");
  });

  eleventyConfig.addFilter("filterByCategory", function(items, category) {
    if (!category || category === "all") return items;
    return items.filter(item => item.data.category === category);
  });

  eleventyConfig.addFilter("filterByCourse", function(lessons, courseSlug) {
    return lessons.filter(lesson => lesson.data.course === courseSlug);
  });

  eleventyConfig.addFilter("limit", function(arr, limit) {
    return arr.slice(0, limit);
  });

  eleventyConfig.addFilter("padStart", function(str, length, char) {
    return String(str).padStart(length, char || '0');
  });

  eleventyConfig.addFilter("selectattr", function(arr, attr, value) {
    return arr.filter(item => {
      const data = item.data || item;
      return data[attr] === value;
    });
  });

  // Shortcodes
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
