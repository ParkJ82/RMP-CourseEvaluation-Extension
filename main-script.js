var previousPage = [];

window.addEventListener("clicked", function(evt) {

    injectRatings();
  
});

function injectRatings() {
    
 

    // Select the document with all Classes
    var allClassPageElement = document.querySelectorAll("iframe")[2]

    // Double Check if allClassPage is in the correct position
    if (allClassPageElement && allClassPageElement.id == "lbFrameContent") {

        // Select the inner document of allClassPageElement based on whether user is in tab or popup
        var allClassPage = (allClassPageElement.contentDocument) ? allClassPageElement.contentDocument : allClassPageElement.contentWindow.document;

        // Select the table of each individual class
        var allClassesInfo = allClassPage.querySelectorAll(".ps-htmlarea td")

        
        // Check if this page has already been scanned
        if (allClassesInfo[0] != previousPage[0]) {
            
            if (allClassesInfo[0] != undefined) {

                // Retrieve the url of the DataBase of the Professor
                var professorurl = "https://search-production.ratemyprofessors.com/solr/rmp/select/?solrformat=true&rows=2&wt=json&q="

                // Go through all of the classes
                for (let currentClassIndex = 0; currentClassIndex < allClassesInfo.length; currentClassIndex++) {

                    // Double Check if the Class Table Exists
                    if (allClassesInfo[currentClassIndex].firstElementChild.nextElementSibling && allClassesInfo[currentClassIndex].firstElementChild.nextElementSibling.nextElementSibling.nextSibling.wholeText) {

                        // Select the Class Code
                        var classCode = allClassesInfo[currentClassIndex].firstElementChild.firstElementChild.textContent.split(" ");
                        classCode = classCode[classCode.length - 1].replace(/[^\d.-]/g, "");

                        // Select the Course Description
                        var classInfoText = allClassesInfo[currentClassIndex].firstElementChild.nextElementSibling.nextElementSibling.nextSibling.wholeText.trim().split(" ");

                        // Check that professor is Posted
                        if (classInfoText.length >= 15) {

                            // Retrieve first and last name of the professor
                            var firstName = classInfoText[classInfoText.length - 1].replace(/[,;]/g, "").toLowerCase();
                            var lastName = classInfoText[classInfoText.length - 2].replace(/[,;]/g, "").toLowerCase();

                            // Finalize the database link for the professor
                            const thisProfessorurl = professorurl + firstName + "+" + lastName;

                            // Find professor ID
                            getProfessorIDAndInject(thisProfessorurl, allClassesInfo[currentClassIndex], firstName, lastName, classCode)

                            // console.log(professorID)

                            

                        }

                    }

                }
            }
        }

        // Save page
        previousPage = allClassesInfo
        

    }
}



// 2. Get Professor Rating

function getProfessorIDAndInject(professorurl, currentIndex, firstName, lastName, classCode) {

    // console.log(professorurl)

    // Set array of school id
    var schoolsId = ["675", "772", "4114", "5165"]

    // Sent the function to main script
    chrome.runtime.sendMessage({ url: professorurl, type: "profRating"}, function (response) {
    // Go to numFound class of the JSON
    var resp = response.JSONresponse;
    var numFound = resp.response.numFound;
    // console.log(numFound)

    // NYU School Variable
    var NYUSchoolFound = false

    // Check if the professor data is found
    if (numFound > 0) {

        // Iterate through each found professor
        for (let currentProfessorIndex = 0; currentProfessorIndex < numFound; currentProfessorIndex++) {

            // Check if NYU school is found
            if (resp.response.docs[currentProfessorIndex] != undefined && schoolsId.includes(resp.response.docs[currentProfessorIndex].schoolid_s)) {
                NYUSchoolFound = true

                // Find Professor ID
                var profID = resp.response.docs[currentProfessorIndex].pk_id;
                // console.log(profID)

                // Calculate overall professor/class rating (return professor rating, sample size, would take again, difficulty)

                //
                getInfoFromRMPDataBase(profID, classCode).then(val => {
                    var [overallRating, classRating, overallDifficulty, classDifficulty, overallSampleSize, classSampleSize] = val
                    var [professorTrustInterval, professorColor] = getTrustInterval(overallSampleSize)
                    var [classTrustInterval, classColor] = getTrustInterval(classSampleSize)
                    console.log(professorTrustInterval)
                    console.log(classTrustInterval)

                    // Create professor and class links
                    var professorLink = " <a style='color: \"" + professorColor + "\"; font-weight: bold'>(" + overallRating + ")</a>"
                    var classLink = " <a style='color: \"" + classColor + "\"; font-weight: bold'>(" + classRating + ")</a>"

                    // Create Div
                    var insertedDIV = document.createElement("div")
                    insertedDIV.style.display = "inline"
                    insertedDIV.innerHTML = professorLink + " " + classLink;

                    // Insert Additional Information to DIV
                    popUpInfo(firstName, lastName, insertedDIV, overallRating, overallDifficulty, overallSampleSize, professorTrustInterval, classRating, classDifficulty, classSampleSize, classTrustInterval)

                    // Inject the DIV
                    currentIndex.firstElementChild.nextElementSibling.nextElementSibling.nextSibling.parentNode.insertBefore(insertedDIV, currentIndex.firstElementChild.nextElementSibling.nextElementSibling.nextSibling.nextSibling); 
                    })
                }

                //var [overallRating, classRating, overallDifficulty, classDifficulty, overallSampleSize, classSampleSize] = getInfoFromRMPDataBase(profID, classCode)

                // Calculate Trust Interval for professor/class

                

                
            }
        }
    
    if (NYUSchoolFound == false) {
        addNA(currentIndex) // CurrentIndex
    }
        
    }
    
    )}
    
    



async function getInfoFromRMPDataBase(professorID, classCodeString) {

    // Set Current Page
    let currentPage = 1;

    var currentURL = "https://www.ratemyprofessors.com/paginate/professors/ratings?tid=" + professorID + "&page=" + currentPage + "&max=20";

    // Set Initial JSON Object
    const request = new Request(currentURL)
    const response = await fetch(request)
    var currentJSON = await response.json()
    // console.log(currentJSON)

    // 1. Overall Rating
    const overallRatingList = [];

    // 2. Class Rating
    const classRatingList = [];

    // 3. Level Of Difficulty Overall
    const overallDifficultyList = [];

    // 4. Level Of Difficulty of the Class
    const classDifficultyList = [];

    // Iterate through current responses
    currentJSON.ratings.forEach(function(individualResponse) {
        // Append Rating to OverallRatingList
        overallRatingList.push(individualResponse.rOverall);

        // Append Difficulty to overallDifficultyList
        overallDifficultyList.push(individualResponse.rEasy)

        var className = individualResponse.rClass

        // Check if class is in class code
        if (className.includes(classCodeString)) {
            // Append Rating to classRatingList if True
            classRatingList.push(individualResponse.rOverall);

            // Append Difficulty to classDifficultyList
            classDifficultyList.push(individualResponse.rEasy)
    }
    }
    )


    // Go through all of the Pages (until remaining is 0)
    while (currentJSON.remaining != 0) {
        
        // Go to the next Page
        currentPage++;

        // Update URL
        currentURL = "https://www.ratemyprofessors.com/paginate/professors/ratings?tid=" + professorID + "&page=" + currentPage + "&max=20";

        // Set the URL to the new JSON object
        const request = new Request(currentURL)
        const response = await fetch(request)
        var currentJSON = await response.json()

        // Iterate through current responses
        currentJSON.ratings.forEach(function(individualResponse) {

            // Append Rating to OverallRatingList
            overallRatingList.push(individualResponse.rOverall);
    
            // Append Difficulty to overallDifficultyList
            overallDifficultyList.push(individualResponse.rEasy)

            var className = individualResponse.rClass
    
            // Check if class is in class code
            if (className.includes(classCodeString)) {
                // Append Rating to classRatingList if True
                classRatingList.push(individualResponse.rOverall);
    
                // Append Difficulty to classDifficultyList
                classDifficultyList.push(individualResponse.rEasy)
            }
    
        })
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
    // Level Of Difficulty of the Class, Overall Sample Size, Class Sample Size]
    return [overallRating, classRating, overallDifficulty, classDifficulty, overallSampleSize, classSampleSize]
}


function getAverageFromList(list) {
    var returnResult = list.reduce(
        (previousValue, currentValue) => previousValue + currentValue, 0
    )

    returnResult = returnResult / list.length
    return returnResult
}


// 3. Get Credibility (Sample Size)

function getTrustInterval(size) {
    if (size >= 50) {
        return ["Very Reliable", "Dark Green"]
    }
    else if (49 >= size && size >= 30) {
        return ["Reliable", "Green"]
    }
    else if (29 >= size && size >= 20) {
        return ["Semi-Reliable", "Light Green"]
    }
    else if (19 >= size && size >= 10) {
        return ["Not Very Reliable", "Yellow"]
    }
    else {
        return ["Do Not Rely", "Red"]
    }
}


// Edit this function
function addNA(currentText){  // function that adds N/A
    var profURL = "https://www.ratemyprofessors.com/AddTeacher.jsp";
    var link = " <a style='color: green; font-weight: bold' href=\"" + profURL + "\" target=\"_blank\">(N/A)</a>";
    var newDiv = document.createElement("div");
    newDiv.style.display = "inline";
    newDiv.innerHTML = link;
    //insert the div after the professor's name
    currentText.firstElementChild.nextElementSibling.nextElementSibling.nextSibling.parentNode.insertBefore(newDiv, currentText.firstElementChild.nextElementSibling.nextElementSibling.nextSibling.nextSibling);
  }


// 4. Add Professor Rating ToolBox

function popUpInfo(firstName, lastName, insertedDIV, overallRating, overallDifficulty, overallSampleSize, professorTrustInterval, classRating, classDifficulty, classSampleSize, classTrustInterval) {

    // Create inner popup info
    var popUpDIV = document.createElement("div")
    var title = document.createElement("h3")
    title.textContent = "Specific Ratings"
    var professorText = document.createElement("p")
    professorText.textContent = "Professor Name: " + firstName + " " + lastName
    var professorRating = document.createElement("p")
    professorRating.textContent = "Professor Rating: " + overallRating
    var specificRating = document.createElement("p")
    specificRating.textContent = "Class Rating: " + classRating
    var professorDifficulty = document.createElement("p")
    professorDifficulty.textContent = "Professor Difficulty: " + overallDifficulty
    var specificDifficulty = document.createElement("p")
    specificDifficulty.textContent = "Class Difficulty: " + classDifficulty
    var overallTrustInterval = document.createElement("p")
    overallTrustInterval.textContent = "Professor Rating Reliability: " + professorTrustInterval + " (Sample Size: " + overallSampleSize + ")"
    var specificTrustInterval = document.createElement("p")
    specificTrustInterval.textContent = "Class Rating Reliability: " + classTrustInterval + " (Sample Size: " + classSampleSize + ")"

    // 
    popUpDIV.appendChild(title)
    popUpDIV.appendChild(professorText)
    popUpDIV.appendChild(professorRating)
    popUpDIV.appendChild(specificRating)
    popUpDIV.appendChild(professorDifficulty)
    popUpDIV.appendChild(specificDifficulty)
    popUpDIV.appendChild(overallTrustInterval)
    popUpDIV.appendChild(specificTrustInterval)

    //
    popUpDIV.classList.add("tooltiptext")
    insertedDIV.classList.add("tooltip")
    insertedDIV.appendChild(popUpDIV)

}