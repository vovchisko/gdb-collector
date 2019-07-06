# gdb-collector
Collects information about games from different sources and save it all into DB

```
npm i
npm run collector
```
All data will be stored in ``/cache`` folder.

Because of Steam API limitation, it will pause every 200-300 requests for a minute or two.
Feel free to stop/restart it any moment - skipt will skip all already requested data and continute from last previous position.
