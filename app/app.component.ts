import { Component } from "@angular/core";
import { ListItem } from "./listItem";
import dialogs = require("ui/dialogs");

@Component({
    selector: "ns-app",
    templateUrl: "app.component.html",
})
export class AppComponent { 
    listItems: Array<ListItem>;

    constructor(){
        this.listItems = [
            new ListItem("Do Homework"),
            new ListItem("Watch Television", true)
        ];
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
            this.listItems.push(new ListItem(r.text));
        })
    }
}
