#! /bin/bash
usage() { echo "Usage: $0 -d <db container name>" 1>&2; exit 1; }

while getopts d: option
do
    case "${option}"
    in
        d) DB=${OPTARG};;
        *) usage;;
    esac
done
if [ -z "$DB" ]; then
    usage
fi

RUNNING=`eval docker inspect $DB | grep '"Running": true'`
if [ -z "$RUNNING" ]; then
    echo Container named \"$DB\" not running >&2
    exit 1;
fi

wget -O pokemons.json https://raw.githubusercontent.com/joseluisq/pokemons/master/pokemons.json

# remove cruft to make it mongo import friendly
sed -i 's/^{"results"://;s/}$//' pokemons.json

# add the dataset to the container
docker cp pokemons.json $DB:pokemons.json

# import it to the database
docker exec -it $DB mongoimport --host localhost --db pokemon --collection pokemon --type json --file pokemons.json --jsonArray

# create a wildcard text index so we can search (note, we escape the dollar to save us from bash)
docker exec -it $DB mongo localhost/pokemon --eval "db.pokemon.createIndex( { '\$**': 'text' } )"

# clean up
rm pokemons.json