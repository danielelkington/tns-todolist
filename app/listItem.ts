export class ListItem {
    //This checkbox control is annoying; when it first renders it apparently gets "updated", and we don't want to 
    //do anything with this fake update.
    hadFirstUpdate: boolean = false;

    constructor(public id:string, public description:string, public complete:boolean = false){
    }
}