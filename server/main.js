import { Meteor } from 'meteor/meteor';
import  VuikoApp from './vuiko_app.js'

Meteor.startup(() => {
    //filling the database
    VuikoApp.fillDb();

    //creates instance of our app on startup
    const app = new VuikoApp();
});
