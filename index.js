const express = require('express');
const app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var rp = require('request-promise-native');
const cheerio = require('cheerio');
var moment = require('moment');

app.use(bodyParser.json());
app.use(express.static('./frontend/dist'))

app.post('/api/parse/forum-page', function (req, res) {
    parseForumThreadList({}).then((threads) => {
        return res.json(threads);
    }).catch((error)=>{
        console.log(error);
        return res.status(500).json(error);
    });
});

app.post('/api/parse/forum-polls', function (req, res) {
    parseForumThreadList({polls:true}).then((threads) => {
        return res.json(threads);
    }).catch((error)=>{
        console.log(error);
        return res.status(500).json(error);
    });
});

app.post('/api/parse/entry-thread', function (req, res) {
    var uri = req.body.threadUri;
    var significantUriPart = uri.substring(uri.indexOf('viewtopic.php?f=')+15).replace('&', '&amp;')
    var start = 0;

    rp(uri).then((html)=>{
        var higestsStart = 0;
        for(let i = 0; i < 1000; i += 15){
            var match = new RegExp (significantUriPart + '&amp;(sid=[a-z0-9]+&amp;)?' + 'start='+i+'">');
            if(html.match(match)){
                higestsStart = i;
            }
        }

        var pages = [];
        for(let i = 0; i <= higestsStart; i += 15){
            pages.push(uri+'&start='+i);
        }

        var promises = pages.map((page, pageIndex)=>{
            return getInfo(page, pageIndex);
        });

        return Promise.all(promises).then((pageInfo)=>{
            var merged = [].concat.apply([], pageInfo);
            var candidates = merged.filter( (cand) => {
                return cand.postBody.images.length > 0;
            });

            return res.json(candidates);
        });

    }).catch((error) => {
        console.log(error);
        return res.status(500).json(error);
    });
});

app.post('/api/parse/poll-thread', function (req, res) {
    var uri = req.body.threadUri;

    getWinners(uri).then((winners)=>{
        return res.json(winners);
    }).catch((error) => {
        console.log(error);
        return res.status(500).json(error);
    });
});

function getWinners(uri){
    return rp(uri).then((html)=>{
        const $ = cheerio.load(html);
        var rawEntries = []
        var entries = [];

        $('td.pollbg table table tbody tr').each((i, element)=>{
            var text = $(element).first().text().trim();
            var parsed = text.match(/^\*?(.+?) in (.+?)\*?by(.+?)\*?\s\s\s/) || [];

            entries[i] = {
                dollName: (parsed[1] || '').trim(),
                caption: (parsed[2] || '').trim(),
                contestant: (parsed[3] || '').trim(),
                imageUri: $(element).find('a img').first().attr('src'),
                votes: parseInt(text.match(/\[(\d+)\]$/)[1] || 0)
            }
        });

        return entries.sort((a, b)=>{
            return b.votes - a.votes;
        });
    });
}

function getInfo(uri, pageIndex){
    return rp(uri).then((html)=>{
        const $ = cheerio.load(html);
        var authors = [];
        var postBody = [];
        $('.postauthor').each((i, element)=>{
            authors[i] = $(element).first().text();
        });

        $('.postbody.pbzone1').each((postIndex, element)=>{
            var obj = {};
            obj.html = $(element).first().html();
            obj.text = $(element).first().text();
            obj.images = [];

            const $1 = cheerio.load(obj.html);
            var images = $1('img')
            images.each((i, element)=>{
                if(! $1(element).closest(".quotecontent").length ) {
                    obj.images.push($1(element).attr('src'));
                }
            });

            var moreImages = $(element).siblings('.attachbg').find('img');
            moreImages.each((i, element)=>{
                obj.images.push($(element).attr('src'));
            });
            
            obj.images = obj.images.filter((image)=>{
                return image.startsWith('./images/smilies') === false;
            });

            obj.images = obj.images.map((image)=>{
                var passOne = image.replace(/^\.\//, 'https://dollforum.com/forum/');
                var passTwo = passOne.replace(/&sid=[0-9a-f]+/, '');
                var passThree = passTwo.replace('&t=1', '&mode=view');
                return passThree;
            });

            if(pageIndex === 0 && postIndex === 0){
                //first post is by the author. no entry!
                obj.images = [];
            }

            postBody[postIndex] = obj;
        });

        var postInfo = [];
        for(let i = 0; i < authors.length; ++i){
            postInfo[i] = {
                postAuthor: authors[i],
                postBody: postBody[i]
            }
        }

        return postInfo;
    });
}

function parseForumThreadList(options){
    return rp('http://dollforum.com/forum/viewforum.php?f=119').then((html)=>{
        const $ = cheerio.load(html);
        var threadTitles = $('a.treadtitle, a.tunreadtitle');

        var threads = [];
        threadTitles.each((i, element)=>{
            threads[i] = {
                name: $(element).first().text(),
                uri: $(element).attr('href')
                    .replace('./', 'http://dollforum.com/forum/')
                    .replace(/&sid=[0-9a-z]+/, '')
            }
            
        });

        options.threads = threads;
        return getContestThreads(options);
    });
}

function getContestThreads(options) {
    //support up to 3 months back
    var now = moment();
    var months = [
        {
            full: now.format('MMMM'),
            abbr: now.format('MMM')
        },
        {
            full: now.subtract(1, "month").format('MMMM'),
            abbr: now.format('MMM')
        },
        {
            full: now.subtract(1, "month").format('MMMM'),
            abbr: now.format('MMM')
        }
    ];

    return months.map((month)=>{
        return {
            name: month.full,
            threads: (getThreadsForMonth(month.abbr, options))
        }
    });
}

function getThreadsForMonth(month, options){
    var candidates = options.threads.filter((t)=> {
        var regex = new RegExp(month,'i');
        return t.name.match(regex) && (t.name.match(/cat(egory)?/i) || t.name.match(/challenge\s[A-E]/i));
    });

    if(options.polls === true){
        //keep voting booth only
        candidates = candidates.filter((t)=>{
            return t.name.match(/vot(e|ing)/i);
        });
    }
    else{
        //exclude voting booth and winners thread
        candidates = candidates.filter((t)=>{
            return !t.name.match(/vot(e|ing)/i) && !t.name.match(/winner/i);
        });
    }

    return candidates;
}

http.listen(process.env.PORT || 5000);


//getInfo('http://dollforum.com/forum/viewtopic.php?f=119&t=89537&start=75');
//getWinners('https://dollforum.com/forum/viewtopic.php?f=119&t=91988');
//parseForumThreadList({polls:true});