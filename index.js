const express = require('express');
const app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var rp = require('request-promise-native');
const cheerio = require('cheerio');
var moment = require('moment');

app.use(bodyParser.json());
app.use(express.static('../tdf-poll-maker/dist'))

app.post('/api/parse/forum-page', function (req, res) {
    parseForumThreadList().then((threads) => {
        return res.json(threads);
    }).catch((error)=>{
        console.log(error);
        return res.status(500).json(error);
    });
});

app.post('/api/parse/entry-thread', function (req, res) {
    var uri = req.body.threadUri;
    var start = 0;

    rp(uri).then((html)=>{
        var higestsStart = 0;
        for(let i = 0; i < 1000; i += 15){
            var test = '&amp;start='+i+'">';
            if(html.includes(test)){
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

function parseForumThreadList(){
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

        return getContestThreads(threads);
    });
}

function getContestThreads(threads) {
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
            threads: (getThreadsForMonth(month.abbr, threads))
        }
    });
}

function getThreadsForMonth(month, threads){
    var candidates = threads.filter((t)=> {
        var regex = new RegExp(month,'i');
        return t.name.match(regex) && t.name.match(/cat(egory)?/i);
    });

    //exclude voting booth and winners thread
    candidates = candidates.filter((t)=>{
        return !t.name.match(/voting/i) && !t.name.match(/winner/i);
    });

    return candidates;
}

http.listen(5000);



//getInfo('http://dollforum.com/forum/viewtopic.php?f=119&t=89537&start=75');
//parseForumThreadList();