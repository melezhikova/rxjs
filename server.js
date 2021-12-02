const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const app = new Koa();
const cors = require('koa2-cors');
const uuid = require('uuid');
const faker = require('faker');

class Message {
  constructor() {
    this.messages = [];
  }

  getMessages (time) {
    if (time !== null) {
      this.clearMessages(time);
    }
    
    return {
      status: "ok",
      timestamp: new Date().getTime(),
      messages: this.messages,
    }
  }

  createMessage() {
    this.messages.push({
      id: uuid.v4(),
      from: faker.internet.email(),
      subject: faker.lorem.sentence(),
      body: faker.lorem.paragraph(),
      received: new Date().getTime(),
    });
  }

  clearMessages(time) {
    this.messages = this.messages.filter((item) => item.received > time);
  }
}

app.use(koaBody({
  urlencoded: true,
  multipart: true,
  text: true,
  json: true,
}));

app.use(
  cors({
    origin: '*',
    credentials: true,
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

const msg = new Message();
setInterval(() => {
  msg.createMessage();
}, 3000)

// CORS
app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({...headers});
    try {
      return await next();
    } catch (e) {
      e.headers = {...e.headers, ...headers};
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

app.use(async (ctx) => {
  let method;
  console.log(ctx.request.query);
  // обратите внимание, что метод (это наш параметр а не HTTP метод) в зависимости от http
  // метода передается по разному либо лежит в ctx.request.query либо в ctx.request.body
  if (ctx.request.method === 'GET') ({ method, time } = ctx.request.query);
  else if (ctx.request.method === 'POST') ({ method, object } = ctx.request.body);
  // В итоге, нам нужно правильно установить ctx.response.status и ctx.response.body
  // ctx.response = {status: string, body: string}

  ctx.response.status = 200;
  switch (method) {
    case 'messages/unread': ctx.response.body = msg.getMessages(time);
      break;
    
    default:
      ctx.response.status = 400;
      ctx.response.body = `Unknown method '${method}' in request parameters`;
  }
});

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
server.listen(port, (error) => {
  if (error) {
    console.log('Error occured:', error);
    return;
  }
  console.log(`Server is listening on ${port} port`);
});

