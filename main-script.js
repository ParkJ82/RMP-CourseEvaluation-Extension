// 1. Get Professor Name

function getProfessorNameListAndClass() {
    
    const professorList = [];

    // Select the document with all Classes
    var allClassPageElement = document.querySelectorAll("iframe")[2];

    // Double Check if allClassPage is in the correct position
    if (allClassPageElement && allClassPageElement.id == "lbFrameContent") {

        // Select the inner document of allClassPageElement based on whether user is in tab or popup
        var allClassPage = (allClassPageElement.contentDocument) ? allClassPageElement.contentDocument : allClassPageElement.contentWindow.document;

        // Select the table of each individual class
        var allClassesInfo = allClassPage.querySelectorAll(".ps-htmlarea td");

        // Check if this page has already been scanned
        if (allClassesInfo[0] != previous_page[0]) {
            
            if (allClassesInfo[0] != undefined) {


                // Retrieve the url of the DataBase of the Professor
                var professorurl = "https://search-production.ratemyprofessors.com/solr/rmp/select/?solrformat=true&rows=2&wt=json&q=";

                // Go through all of the classes
                for (let currentClassIndex = 0; currentClassIndex < allClassesInfo.length; currentClassIndex++) {

                    // Double Check if the Class Table Exists
                    if (allClassesInfo[currentClassIndex].firstElementChild.nextElementSibling && allClassesInfo[currentClassIndex].firstElementChild.nextElementSibling.nextElementSibling.nextSibling.wholeText) {

                        // Select the Class Code
                        var classCode = allClassesInfo[currentClassIndex].firstElementChild.firstElementChild.innerHTML;
                        classCode = classCode[classCode.length - 1].replace(/[^\d.-]/g, "");


                        // Select the Course Description
                        var classInfoText = allClassesInfo[currentClassIndex].firstElementChild.nextElementSibling.nextElementSibling.nextSibling.wholeText.trim().split(" ");

                        // Check that professor is Posted
                        if (classInfoText.length >= 15) {

                            // Retrieve first and last name of the professor
                            var firstName = classInfoText[classInfoText.length - 1].replace(/[,;]/g, "").toLowerCase();
                            var lastName = classInfoText[classInfoText.length - 2].replace(/[,;]/g, "").toLowerCase();

                            // Finalize the database link for the professor
                            thisProfessorurl = professorurl + firstName + "+" + lastName;

                            // Append the information to professorList (professorurl, classInfoText)
                            professorList.push([thisprofessorurl, allClassesInfo[currentClassIndex], classCode])
                        }

                    }

                }
            }
        }
        // Save current Page to Aviod Duplicate
        previousPage = allClassesInfo;

    }

    return professorList;
}


// 2. Get Professor Rating

function getProfessorRatings(professorClassList) {

    // Set array of school id
    var schoolsId = ["675", "772", "4114", "5165"];

    // Iterate through each class
    for (let professorIndex = 0; professorIndex < professorClassList.length; professorIndex++) {

        // Sent the function to main script
        chrome.runtime.sendMessage({ url: professorClassList[professorIndex][0], type: "profRating"}, function (response) {

            // Change website to JSON
            var resp = response.JSONresponse;

            // Go to numFound class of the JSON
            var numFound = resp.response.numFound;

            // Check if the professor data is found
            if (numFound > 0) {

                // Set variable to see if nyu professor is found
                let foundNYU = false;

                // Iterate through each found professor
                for (let currentProfessorIndex = 0; currentProfessorIndex < numFound; currentProfessorIndex++) {

                    // Check if NYU school is found
                    if (resp.response.docs[currentProfessorIndex] != undefined && schoolsId.includes(resp.response.docs[currentProfessorIndex].schoolid_s)) {

                        // Set foundNYU to true
                        foundNYU = true;

                        // Find Professor ID
                        var profID = resp.response.docs[currentProfessorIndex].pk_id;
                        const totalProfessorRatingList = getInfoFromRMPDataBase(profID, professorClassList[professorIndex][2])

                        
                    }
                }

            }

        })
    }

    
}


function getInfoFromRMPDataBase(professorID, classCodeString) {
    // Store Rating, Class, Level Of Difficulty


    // Set Current Page
    let currentPage = 1;

    var currentURL = "https://www.ratemyprofessors.com/paginate/professors/ratings?tid=" + professorID + "&page=" + currentPage + "&max=20";

    // Set Initial JSON Object
    var currentJSON = currentURL.JSONresponse;

    // 1. Overall Rating
    const overallRatingList = [];

    // 2. Class Rating
    const classRatingList = [];

    // 3. Level Of Difficulty Overall
    const overallDifficultyList = [];

    // 4. Level Of Difficulty of the Class
    const classDifficultyList = [];

    // Iterate through current responses
    for (var individual_response in currentJSON.ratings) {

        // Append Rating to OverallRatingList
        overallRatingList.push(currentJSON[individual_response].rOverall);

        // Append Difficulty to overallDifficultyList
        overallDifficultyList.push(currentJSON[individual_response].rEasy)

        // Check if class is in class code
        if (currentJSON[individual_response].rClass.includes(classCodeString)) {
            // Append Rating to classRatingList if True
            classRatingList.push(currentJSON[individual_response].rOverall);

            // Append Difficulty to classDifficultyList
            classDifficultyList.push(currentJSON[individual_response].rEasy)
        }

    }


    // Go through all of the Pages (until remaining is 0)
    while (currentJSON.remaining != 0) {
        
        // Go to the next Page
        currentPage++;

        // Update URL
        currentURL = "https://www.ratemyprofessors.com/paginate/professors/ratings?tid=" + professorID + "&page=" + currentPage + "&max=20";

        // Set the URL to the new JSON object
        currentJSON = currentURL.JSONresponse;

        // Iterate through current responses
        for (var individual_response in currentJSON.ratings) {

            // Append Rating to OverallRatingList
            overallRatingList.push(currentJSON[individual_response].rOverall);
    
            // Append Difficulty to overallDifficultyList
            overallDifficultyList.push(currentJSON[individual_response].rEasy)
    
            // Check if class is in class code
            if (currentJSON[individual_response].rClass.includes(classCodeString)) {
                // Append Rating to classRatingList if True
                classRatingList.push(currentJSON[individual_response].rOverall);
    
                // Append Difficulty to classDifficultyList
                classDifficultyList.push(currentJSON[individual_response].rEasy)
            }
    
        }
    }

    // 5. Sample Size (Overall/Class)
    const overallSampleSize = overallRatingList.length;
    const classSampleSize = classRatingList.length;

    // Average All of the Ratings/Difficulties
    const overallRating = getAverageFromList(overallRatingList);
    const overallDifficulty = getAverageFromList(overallDifficultyList);
    const classRating = getAverageFromList(classRatingList);
    const classDifficulty = getAverageFromList(classDifficultyList);

    // return [Overall Rating, Class Rating, Level Of Difficulty Overall, 
    // Level Of Difficulty of the Class, [Overall Sample Size, Class Sample Size]]
    return [overallRating, classRating, overallDifficulty, classDifficulty, [overallSampleSize, classSampleSize]]
}


function getAverageFromList(list) {
    const returnResult = list.reduce(
        (previousValue, currentValue) => previousValue + currentValue, 0
    )
    return returnResult
}



// 3. Get Course Evaluation Rating



// 4. Get Credibility (Sample Size)

function getCredibility(size) {
    if (size >= 50) {
        return "Very Reliable"
    }
    else if (49 >= size >= 30) {
        return "Reliable"
    }
    else if (29 >= size >= 20) {
        return "Semi-Reliable"
    }
    else if (19 >= size >= 10) {
        return "Not Very Reliable"
    }
    else {
        return "Do Not Rely"
    }
}

// 5. Get Credibility Interval



// 6. Add ToolBox


