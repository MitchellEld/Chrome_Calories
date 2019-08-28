import "./../css/popup.css";//stylesheet for popup
require('material-design-lite');
import hello from "./popup/example";
import { rejects } from "assert";
const frontend = require('./frontend.js');
const scrape = require('./scraping.js');
//[FRONTEND]

//Creating a function to toggle a CSS rule which governs visibility
//For more info:
//https://stackoverflow.com/questions/19074171/how-to-toggle-a-divs-visibility-by-using-a-button-click
function openOutput() {
    var div = document.getElementById("output");
    div.style.display = div.style.display == "block" ? "none" : "block";
}
//Specifying the criteria by which 'openOutput()' is called with an EventListener
//In this case, when someone clicks the id="output-button" button in 'popup.html'.
// document.getElementById("output-button").addEventListener('click', openOutput); //tells button to use openOutput on click
//---------------------------------------------------------------------------------------------------------------------------

//[BACKEND]

//Creating a variable to store the string the user enters on the popup
var queryString = localStorage.getItem('receivedQuery');

//Creating a function which puts 'queryString' in local storage.
function saveQuery() {
    localStorage.setItem('receivedQuery', queryString);
}

//Creating a larger function which accounts for the case where the user submits an empty input string and calls the API function otherwise
async function getQuery() {
    queryString = document.getElementById("query-input").value;
    if (queryString != "")
    {
        saveQuery();
        displayObj.calorieCount = 0;
        if(!queryString.includes("/")){ //querystring is not a url
             displayObj =  await displayQueryFood(); //displayObj is defined below and it holds info that we want to display
            frontend.changeSearchOutput(displayObj.input, displayObj.interpretation, displayObj.calorieCount);
        } else{
            displayQueryRecipe();
            frontend.changeSearchOutput("", "Your Recipe", displayObj.calorieCount);
        }
    }
    else
    {
        frontend.noInput();
    }
}

//Specifying the criteria by which 'getQuery()' is called with an EventListener
//In this case, when someone clicks the class="query-button" button in 'popup.html'
document.getElementById("query-form").addEventListener('submit',function(e) { //On query submit click, retrieve, store, and display the query
    e.preventDefault()
    try {
        instance = require('./credentials.js');
        Cred = instance.getCred();
        credentialsGood = true;
    } catch(err){
        credentialsGood = false;
        frontend.credentialsNotFound();
    }
    if(credentialsGood){
        getQuery();
    }
});

//Accesses credentials.js file in order to acquire keys for API's
//credentials .js should be created in the same directory as popup.js
//and an object array created which resembles the following format:
/*
var Cred = {
    //Edamam
    app_id :"xxxxxxxx",
    app_key :"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    //Nutritionix
    x_app_id :"xxxxxxxx",
    x_app_key :"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    x_remote_user_id : "0"
};
exports.getCred = function() {
    return Cred;
}
*/
//Replace the 'xxxx' values with the correct keys by signing up to use:
//https://developer.edamam.com/food-database-api
//https://www.nutritionix.com/business/api
var credentialsGood = true;
try {
    var instance = require('./credentials.js');
    var Cred = instance.getCred();
} catch(err){
    frontend.credentialsNotFound();
}
class Display {
    constructor(input,inter,cc){
        this.input= input;
        this.interpretation= inter;
        this.calorieCount= cc;
    }
}
var displayObj = new Display(" ", " ", 0);


function displayQueryFood() { //gets the calorie count of a single ingredient
    return new Promise(resolve=>{
        var request2 = new XMLHttpRequest();
        request2.open('POST', 'https://trackapi.nutritionix.com/v2/natural/nutrients' );
        request2.setRequestHeader( 'x-app-id',Cred.x_app_id );
        request2.setRequestHeader( 'x-app-key',Cred.x_app_key );
        request2.setRequestHeader( 'x-remote-user-id',Cred.x_remote_user_id );
        request2.setRequestHeader( 'Content-Type','application/json' );
        //https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
        //https://docs.google.com/document/d/1_q-K-ObMTZvO0qUEAxROrN3bwMujwAN25sLHwJzliK0/edit
        //https://gist.github.com/sgnl/bd760187214681cdb6dd
        var jsonData = { query: queryString };
        var myJSON = JSON.stringify(jsonData);
        request2.send(myJSON);
        request2.onload = function() {
            try {
                var returnJSON = JSON.parse(request2.responseText);
                var nutribool = returnJSON.hasOwnProperty('message');
                if (nutribool)
                {
                    throw error;
                }
                else
                {
                    //diplay results found from NutritionX api
                    var displayInfo = new Display(" ", " ", 1);
                    displayInfo.input = queryString;
                    displayInfo.interpretation = returnJSON["foods"][0]["food_name"];
                    displayInfo.calorieCount += returnJSON["foods"][0]["nf_calories"];
                    resolve(displayInfo);
                }
            }
            catch(err) {
                frontend.inputNotFound(queryString);//diplay that nothing was found from either api
            }
        }
        request2.onerror = function(){
            frontend.requestFailed();
            
        }
    });
}

async function displayQueryRecipe(){ //This function displays a recipe by getting ingredients and summing the caloriecount of each ingredient.
    displayObj.calorieCount = 0;
    var tempDisplayObj = new Display("","",0);
    var ingredientArr = await scrape.getIngredients(queryString);
    var i;
    for(i =0; i<ingredientArr.length; i++){
        queryString = ingredientArr[i];
        tempDisplayObj =  await displayQueryFood();
        displayObj.calorieCount += tempDisplayObj.calorieCount;
    }
}


//Here is request code for edamam just for reference but it is unlikely we will ever use it because of the api call limit which cant do a recipe
//
//Creating a larger function which does several things:
// * Creates an XMLHttpRequest for use with a 'GET' request to the Edamam API and makes that request
// * Interprets and displays the JSON data from the Edamam API
// * If the Edamam API turns up nothing:
//   - Creates an XMLHttpRequest for use with a 'POST' request to the Nutritionix API and makes that request
//   - Interprets and displays the JSON data from the Nutritionix API
// * If the Nutritionix API turns up nothing:
//   - Displays an error message
/*
function displayQuery() {
    //'GET' Request
    var request = new XMLHttpRequest();
    request.open('GET', 'https://api.edamam.com/api/food-database/parser?ingr='+queryString+'&app_id='+Cred.app_id+'&app_key='+Cred.app_key);
    request.onload = function() {
        try {
            var data = JSON.parse(request.responseText);
            if (data["parsed"].length < 1 || data["parsed"] == undefined){
                throw "error";
            }
            console.log("used edamam");
            frontend.changeSearchOutput(queryString,data["parsed"][0]["food"]["label"],(data["parsed"][0]["quantity"])*(data["parsed"][0]["food"]["nutrients"]["ENERC_KCAL"]));
        }
        catch(err)
        {
            //'POST' Request
            var request2 = new XMLHttpRequest();
            request2.open('POST', 'https://trackapi.nutritionix.com/v2/natural/nutrients' );
            request2.setRequestHeader( 'x-app-id',Cred.x_app_id );
            request2.setRequestHeader( 'x-app-key',Cred.x_app_key );
            request2.setRequestHeader( 'x-remote-user-id',Cred.x_remote_user_id );
            request2.setRequestHeader( 'Content-Type','application/json' );
            //https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
            //https://docs.google.com/document/d/1_q-K-ObMTZvO0qUEAxROrN3bwMujwAN25sLHwJzliK0/edit
            //https://gist.github.com/sgnl/bd760187214681cdb6dd
            var jsonData = { query: queryString };
            var myJSON = JSON.stringify(jsonData);
            request2.send(myJSON);
            request2.onload = function() {
                try {
                    var returnJSON = JSON.parse(request2.responseText);
                    var nutribool = returnJSON.hasOwnProperty('message');
                    if (nutribool == true)
                    {
                        throw error;
                    }
                    else
                    {
                        console.log("used NutritionX");//diplay results found from NutritionX api
                        frontend.changeSearchOutput(queryString,returnJSON["foods"][0]["food_name"],returnJSON["foods"][0]["nf_calories"]);
                    }
                }
                catch(err) {
                    frontend.inputNotFound(queryString);//diplay that nothing was found from either api
                }
            }
        }
    }
    request.send();
}*/