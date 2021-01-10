import 'reflect-metadata';
import { Connection, createConnection, getMongoRepository, MongoRepository } from 'typeorm';
import { ApolloServer } from 'apollo-server';
import { Post, PostResolver } from './entity/Post';
import { User, UserResolver } from './entity/User';
import { buildSchema, NonEmptyArray } from 'type-graphql';

export interface Context {
  userRepository: MongoRepository<User>;
  postRepository: MongoRepository<Post>;
}

const bootstrap = async () => {
  const connection: Connection = await createConnection();

  const userRepository = getMongoRepository(User);
  const postRepository = getMongoRepository(Post);

  const schema = await buildSchema({
    resolvers: [UserResolver, PostResolver] as NonEmptyArray<Function>,
  });

  const server = new ApolloServer({
    schema,
    playground: true,
    context: (): Context => {
      return { userRepository, postRepository };
    },
  });

  const { url } = await server.listen(4000);
  console.log(`Server is running, GraphQL Playground available at ${url}`);
};

bootstrap();

// const timber = await userRepository.find({ where: { firstName: /imb/ } });
// console.log('User found: ', timber);
// const firstPost = await postRepository.find({ where: { title: /first/ } });
// console.log('Post found: ', firstPost);
// createConnection()
//   .then(async (connection) => {
//     console.log('Finding a user into the database...');
//     const user = await connection.manager.findOne(User, { firstName: 'Timber' });
//     console.log('Found a user:', user);

//     // const post = new Post();
//     // post.title = 'My first post';
//     // post.body = 'This is the body of the post';
//     // post.author = user;
//     // await connection.manager.save(post);
//     // console.log('Saved a new post with id: ' + post.id);
//     const post = await connection.manager.findOne(Post, { author: user });
//     console.log('Found a post:', post);

//     // console.log('Loading users from the database...');
//     // const users = await connection.manager.find(User);
//     // console.log('Loaded users: ', users);

//     // console.log('Loading posts from the database...');
//     // const posts = await connection.manager.find(Post);
//     // console.log('Loaded posts: ', posts);
//   })
//   .catch((error) => console.log(error));
