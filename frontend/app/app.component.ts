import { Component, NgZone } from "@angular/core";
import { ListItem } from "./listItem";
import {ListItemDTO} from "./listItemDTO";
import dialogs = require("ui/dialogs");
import * as appSettings from "application-settings";
//import {Http, Headers, Response} from "@angular/http";
var http = require("http");
import {Observable} from "rxjs/Rx";
import "rxjs/add/operator/map";
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
            var modifiedUTC = Math.floor((new Date()).getTime()/1000);
            this.database.execSQL("INSERT INTO ListItem(Id, Description, Complete, ModifiedUTC) VALUES(?,?,?,?)",
                [newItem.id, newItem.description, 
                newItem.complete ? 1 : 0, modifiedUTC]).then(id => {
                }, error =>{
                    console.log("INSERT ERROR", error);
                });
            this.listItems.push(newItem);
        });
    }

    complete(item:ListItem){
        item.complete = false;
        this.database.execSQL("UPDATE ListItem SET Complete = 1, ModifiedUTC = ? WHERE Id = ?", 
            [(Math.floor((new Date()).getTime()/1000)), item.id])
            .then(id => {},error => {console.log("UPDATE DB ERROR", error)});
        //Run in a zone to ensure the change event gets triggered
        this.zone.run(() => {this.listItems.splice(this.listItems.indexOf(item), 1);});
    }

    sync(){
        var lastSyncTime = parseInt(appSettings.getString("lastSyncTime", "0"));
        var thisSyncTime = '' + (Math.floor((new Date()).getTime()/1000));
        var updatedItems : Array<ListItemDTO> = [];
        var itemsFromServer : Array<ListItemDTO> = [];
        var component = this;

        this.database.each("SELECT Id, Description, Complete, ModifiedUTC FROM ListItem WHERE ModifiedUTC > ?",
        [lastSyncTime],
        function (err, row) {
            if (err){
                console.log("SELECT ERROR", err);
                return;
            }
            var item = new ListItemDTO(row[0], row[1], row[2] == 1, row[3]);
            updatedItems.push(item);
        }).then(function(count){
            let url = "https://todo-list-1.azurewebsites.net/api/ListItem?lastSyncTime=" + lastSyncTime;
            let content = JSON.stringify(updatedItems);

            http.request({
                url: url,
                method: "POST",
                headers: {"Content-Type" : "application/json"},
                content: content
            }).then(function(response){
                itemsFromServer = JSON.parse(response.content);
                
                //Going to do a heap of database operations, store their promises
                //in here so we can wait for them all at the end.
                var promises : Array<Promise<any>> = [];
                var childPromises : Array<Promise<any>> = [];

                itemsFromServer.forEach(item => {
                    promises.push(component.database.get("SELECT COUNT(*) FROM ListItem WHERE Id = ?", [item.Id])
                    .then(res => {
                        if (res[0] > 0){
                            //Item exists already - need to update!
                            childPromises.push(component.database.execSQL("UPDATE ListItem SET Complete = ?, Description = ?, ModifiedUTC = ? WHERE Id = ?", 
                                [item.Complete ? 1 : 0, item.Description, item.ModifiedUTC, item.Id]));
                        }
                        else{
                            //Item doesn't exist - need to insert.
                            childPromises.push(component.database.execSQL("INSERT INTO ListItem(Id, Description, Complete, ModifiedUTC) VALUES(?,?,?,?)",
                                [item.Id, item.Description, 
                                item.Complete ? 1 : 0, item.ModifiedUTC]));
                        }
                    }, error => console.log("SELECT DB ERROR", error)))
                });

                //Wait for the outer promises (SELECT), then the inner promises (UPDATE/INSERT), then refresh items displayed.
                Promise.all(promises)
                    .then(values => Promise.all(childPromises)
                    .then(values => {
                        appSettings.setString("lastSyncTime", thisSyncTime);
                        component.zone.run(()=> component.fetchItems());
                    }));
            }, function (error){
                console.log("Error:", error);
            });
        });
    }
}
