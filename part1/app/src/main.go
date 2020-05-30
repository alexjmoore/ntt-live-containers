package main

import (
    "os"
    "fmt"
    "log"
    "time"
    "context"
    "net/http"
    "encoding/json"

    "github.com/gorilla/mux"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

var DBSERVER string
var DATABASE string
var COLLECTION string

type Pokemon struct {
    Name string             `json:"name"            bson:"name"`
    Type []string           `json:"type"            bson:"type"`
    National_number string  `json:"national_number" bson:"national_number"`
    Evolution struct {
        Name        string  `json:"name"            bson:"name"`
    } `json:"evolution" bson:"evolution"`
    Sprites struct {
        Normal      string  `json:"normal"          bson:"normal"`
        Large       string  `json:"large"           bson:"large"`
        Animated    string  `json:"animated"        bson:"animated"`
    } `json:"sprites" bson:"sprites"`
    Total   int             `json:"total"           bson:"total"`
    Hp      int             `json:"hp"              bson:"hp"`
    Attack  int             `json:"attack"          bson:"attack"`
    Defense int             `json:"defense"         bson:"defense"`
    Sp_atk  int             `json:"sp_atk"          bson:"sp_atk"`
    Sp_def  int             `json:"sp_def"          bson:"sp_def"`
    Speed   int             `json:"speed"           bson:"speed"`
}

// ### database helper function

func ConnectDB() *mongo.Collection {
    ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
    client, err := mongo.NewClient(options.Client().ApplyURI("mongodb://" + DBSERVER))
    err = client.Connect(ctx)

    if err != nil {
        log.Println("Database connection error: " + err.Error())
    }

    err = client.Ping(ctx, nil)

    if err != nil {
        log.Println("Unable to connect to MongoDB: " + err.Error())
    } else {
        log.Println("Connected to MongoDB!")
    }

    collection := client.Database(DATABASE).Collection(COLLECTION)

    return collection
}

// #### router handlers ####

func home (w http.ResponseWriter, r *http.Request) {
    log.Println("Endpoint Hit: root")
    fmt.Fprintf(w, "Welcome to the NTT Pokémon demo API root!")
}

func searchPokemon(w http.ResponseWriter, r *http.Request) {
    query := r.FormValue("query")
    log.Println("Endpoint Hit: searchPokemon " + query)

    // if we got a ?query= param, then we create a text search based on that
    mongoSearchBSON := bson.M{}
    if query != "" {
        mongoSearchBSON = bson.M{ "$text": bson.M{"$search": query} }
    }

    collection := ConnectDB()

    ctx, _ := context.WithTimeout(context.Background(), 30*time.Second)
    cursor, err := collection.Find(ctx, mongoSearchBSON)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        w.Write([]byte(`{ "message": "` + err.Error() + `" }`))
        return
    }
    defer cursor.Close(ctx)

    var pokemons []Pokemon
    for cursor.Next(ctx) {
        var pokemon Pokemon
        err := cursor.Decode(&pokemon)
        if err != nil {
            log.Println(err)
        }
        pokemons = append(pokemons, pokemon)
    }

    if err := cursor.Err(); err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        w.Write([]byte(`{ "message": "` + err.Error() + `" }`))
        return
    }

    if len(pokemons) == 0 {
        w.WriteHeader(http.StatusNotFound)
        return
    }
    json.NewEncoder(w).Encode(pokemons)
}

// ### router definition

func handleRequests() {
    myRouter := mux.NewRouter().StrictSlash(true)
    myRouter.HandleFunc("/", home)
    myRouter.HandleFunc("/pokemon", searchPokemon)
    log.Fatal(http.ListenAndServe(":4242", myRouter))
}

// ### main

func main() {

    DBSERVER = os.Getenv("DBSERVER")
    DATABASE = os.Getenv("DATABASE")
    COLLECTION = os.Getenv("COLLECTION")

    var envError = false;
    if DBSERVER == "" {
        log.Println("No DBSERVER environment set")
        envError = true;
    }

    if DATABASE == "" {
        log.Println("No DATABASE environment set")
        envError = true;
    }

    if COLLECTION == "" {
        log.Println("No COLLECTION environment set")
        envError = true;
    }

    if envError == true {
        log.Fatal("No working environment available")
    }

    log.Println("NTT Pokémon REST API v1.0")
    log.Printf("Using - SERVER: %v DB: %v COLLECTION: %v", DBSERVER, DATABASE, COLLECTION)
    handleRequests()
}