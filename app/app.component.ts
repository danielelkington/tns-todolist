import { Component, NgZone } from "@angular/core";
import { ListItem } from "./listItem";
import dialogs = require("ui/dialogs");
var Sqlite = require("nativescript-sqlite");
var Toolbox = require("nativescript-toolbox");

@Component({
    selector: "ns-app",
    templateUrl: "app.component.html",
})
export class AppComponent { 
    listItems: Array<ListItem>;
    database: any;

    private initialiseDatabaseIfNotExists(){
        //Initialise database if it doesn't exist
        (new Sqlite("todolist.db")).then(db => {
            db.execSQL("CREATE TABLE IF NOT EXISTS ListItem " +
                    "(Id TEXT PRIMARY KEY, Description TEXT, Complete INTEGER NOT NULL, ModifiedUTC INTEGER)")
            .then(id => {
                this.database = db;
                this.fetchItems();
            }, error => {
                console.log("CREATE TABLE ERROR", error);
            });
        }, error => {
            console.log("OPEN DB ERROR", error);
        });
    }

    constructor(private zone: NgZone){
        this.initialiseDatabaseIfNotExists();
    }

    private fetchItems(){
        this.listItems = [];
        var listItems = this.listItems;
        this.database.each("SELECT Id, Description, Complete FROM ListItem WHERE Complete = ?",
        [0],
        function (err, row) {
            if (err){
                console.log("SELECT ERROR", err);
                return;
            }
            listItems.push(new ListItem(row[0], row[1], row[2]));
        });
    }

    addItem(){
        dialogs.prompt({
            title: "New Item",
            okButtonText: "Add",
            cancelButtonText: "Cancel"
        }).then(r => {
            if (!r.result || !r.text){
                return;
            }
            var newItem = new ListItem(Toolbox.uuid(), r.text);
            this.database.execSQL("INSERT INTO ListItem(Id, Description, Complete, ModifiedUTC) VALUES(?,?,?,?)",
                [newItem.id, newItem.description, 
                newItem.complete ? 1 : 0, (new Date()).getUTCMilliseconds()]).then(id => {
                }, error =>{
                    console.log("INSERT ERROR", error);
                });
            this.listItems.push(newItem);
        });
    }

    complete(item:ListItem){
        item.complete = false;
        this.database.execSQL("UPDATE ListItem SET Complete = 1, ModifiedUTC = ? WHERE Id = ?", 
            [(new Date()).getUTCMilliseconds(), item.id])
            .then(id => {},error => {console.log("UPDATE DB ERROR", error)});
        //Run in a zone to ensure the change event gets triggered
        this.zone.run(() => {this.listItems.splice(this.listItems.indexOf(item), 1);});
    }
}
