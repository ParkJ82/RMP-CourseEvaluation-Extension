// Store all the ratings from Rmp/Course Evaluation in a dictionary

// make function that takes the average of all the ratings
// 1. add up all the ratings
// 2. divide it by length of dictionary
// 3. return average rating, size

function averageRatingAndSize(ratingDictionary) {
    let totalRating = 0;
    for (const rating of ratingDictionary) {
        totalRating += rating;
    }
    const totalRatingCount = Object.keys(ratingDictionary).length;
    const returnRating = totalRating/totalRatingCount;
    return {returnRating, totalRatingCount}
}

