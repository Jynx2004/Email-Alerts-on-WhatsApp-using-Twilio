const Imap = require('node-imap');
const inspect = require('util').inspect;

exports.handler = async function (context, event, callback) {
    const client = context.getTwilioClient();
    const from = event.From;
    const to = event.To;
    const body=event.Body;
    if(body!=="check")
    { 
        // Sending invalid message if body doesnt include check 

        callback(null,"Message invalid");
        return ;
    }

    //Creating imap instance by configuring your gmail and password to connect with your gmail account for mail retrieval

    var imap = new Imap({
        user: 'your mail id',
        password: 'your password',
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
    });

    // Helper to fetch emails
    function openInbox(cb) {
        imap.openBox('INBOX', true, cb);
    }

    imap.once('ready', function () {
        openInbox(function (err, box) {
            if (err) throw err;

            var f = imap.seq.fetch('1:3', {
                bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
                struct: true,
            });
            // this array will contain all the header part of the mail.
        
            let arr = [];

            //Used for parsing the message

            f.on('message', function (msg, seqno) {
                console.log('Message #%d', seqno);
                var prefix = '(#' + seqno + ') ';
                msg.on('body', function (stream, info) {
                    var buffer = '';
                    stream.on('data', function (chunk) {
                        buffer += chunk.toString('utf8');
                    });
                    stream.once('end', function () {
                        console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
                        // header pushed into arr
                        arr.push(inspect(Imap.parseHeader(buffer)));
                    });
                });
                msg.once('end', function () {
                    console.log(prefix + 'Finished');
                });
            });

            f.once('error', function (err) {
                console.log('Fetch error: ' + err);
            });

            f.once('end', async function () {
                console.log('Done fetching all messages!');
                console.log(arr);
                    try {
        // Send SMS via Twilio
        const message = await client.messages.create({
            body: `Hello! Here are your emails: ${JSON.stringify(arr)}`,
            to: from,
            from: to,
        });

        callback(null,`Message sent with SID: ${message.sid}`);
    } catch (err) {
        console.error(err);
        callback(err);
    }
                imap.end();
            });
        });
    });

    imap.once('error', function (err) {
        console.log(err);
    });

    imap.once('end', function () {
        console.log('Connection ended');
    });

    imap.connect();

};