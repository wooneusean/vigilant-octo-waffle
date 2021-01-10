import { Column, Entity, ObjectIdColumn } from 'typeorm';
import { User } from './User';
import { ObjectId } from 'mongodb';
import { Context } from '../index';
import {
  Arg,
  Args,
  ArgsType,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  ResolverInterface,
  Root,
} from 'type-graphql';
import { ObjectIDResolver } from 'graphql-scalars';

// TypeGraphQL ArgsType
@InputType({ description: 'New post data' })
export class AddPostInput implements Partial<Post> {
  @Field()
  title: string;

  @Field()
  body: string;

  @Field()
  authorId: string;
}

// TypeGraphQL ArgsType
@ArgsType()
export class GetPostArgs {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  body?: string;

  @Field({ nullable: true })
  authorName?: string;
}

// TypeGraphQL ObjectType
@ObjectType()
// TypeORM Entity
@Entity()
export class Post {
  async init(newPostData: AddPostInput) {
    this.title = newPostData.title;
    this.body = newPostData.body;
    this.authorId = newPostData.authorId;
    this.publishDate = new Date();
  }

  // TypeGraphQL Field
  @Field((type) => ObjectIDResolver)
  // TypeORM Column
  @ObjectIdColumn()
  readonly _id: ObjectId;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  body: string;

  @Field()
  author: User;

  @Column()
  authorId: string;

  @Field()
  @Column()
  publishDate: Date;
}

// TypeGraphQL Resolver
@Resolver(Post)
export class PostResolver implements ResolverInterface<Post> {
  @Query((returns) => Post, { nullable: true })
  async post(@Arg('postId') id: string, @Ctx() ctx: Context) {
    return ctx.postRepository.findOne({ where: { id: new ObjectId(id) } });
  }

  // async post(@Args() { id }: GetPostArgs, @Ctx() ctx: Context) {
  //   return ctx.postRepository.findOne({ where: { id: new ObjectId(id) } });
  // }

  @Query((returns) => [Post], { nullable: true })
  async posts(@Ctx() ctx: Context) {
    return ctx.postRepository.find();
  }

  @Query((returns) => [Post], { nullable: true })
  async postsByTitle(@Arg('title') title: string, @Ctx() ctx: Context) {
    return ctx.postRepository.find({ where: { title: new RegExp(title, 'gi') } });
  }

  // async postsByTitle(@Args() { title }: GetPostArgs, @Ctx() ctx: Context) {
  //   return ctx.postRepository.find({ where: { title: new RegExp(title, 'g') } });
  // }

  @Query((returns) => [Post], { nullable: true })
  async postsByBody(@Arg('body') body: string, @Ctx() ctx: Context) {
    return ctx.postRepository.find({ where: { body: new RegExp(body, 'gi') } });
  }

  // async postsByBody(@Args() { body }: GetPostArgs, @Ctx() ctx: Context) {
  //   return ctx.postRepository.find({ where: { body: new RegExp(body, 'g') } });
  // }

  @Query((returns) => [Post], { nullable: true })
  async postsByAuthor(@Arg('authorName') authorName: string, @Ctx() ctx: Context) {
    const results = await ctx.userRepository.find({ where: { fullName: new RegExp(authorName, 'gi') } });
    console.log(results);

    return ctx.postRepository.find({
      where: {
        author: { fullName: new RegExp(authorName, 'gi') },
      },
    });
  }

  // async postsByAuthor(@Args() { authorName }: GetPostArgs, @Ctx() ctx: Context) {
  //   return ctx.postRepository.find({
  //     where: {
  //       $or: [{ 'author.firstName': new RegExp(authorName, 'g') }, { 'author.lastName': new RegExp(authorName, 'g') }],
  //     },
  //   });
  // }

  @FieldResolver()
  async author(@Root() post: Post, @Ctx() ctx: Context) {
    const retrievedAuthor = await ctx.userRepository.findOne({ where: { _id: new ObjectId(post.authorId) } });
    return retrievedAuthor;
  }

  @Mutation((returns) => Post, { description: 'Adds new post' })
  async addPost(@Arg('data') newPostData: AddPostInput, @Ctx() ctx: Context) {
    if (!(await ctx.userRepository.findOne({ where: { _id: new ObjectId(newPostData.authorId) } }))) {
      throw new Error('User with provided UserID does not exist.');
    }
    const post = new Post();
    post.init(newPostData);
    await ctx.postRepository.save(post);
    return post;
  }
}
