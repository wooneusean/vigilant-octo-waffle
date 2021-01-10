import {
  Arg,
  ArgsType,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  ResolverInterface,
  Root,
} from 'type-graphql';
import { Entity, ObjectIdColumn, Column } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Context } from '../index';
import { ObjectIDResolver } from 'graphql-scalars';
import { Post } from './Post';
import * as argon2 from 'argon2';
import { UserInputError } from 'apollo-server';

@InputType({ description: 'New user data' })
export class AddUserInput implements Partial<User> {
  @Field()
  userName: string;

  @Field()
  password: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  age?: number;

  @Field({ nullable: true })
  bio?: string;
}

// @ArgsType()
// export class GetUserArgs {
//   @Field({ nullable: true })
//   id?: string;

//   @Field({ nullable: true })
//   // @MinLength(3)
//   firstName?: string;

//   @Field({ nullable: true })
//   lastName?: string;

//   @Field((type) => Int, { nullable: true })
//   age?: number;
// }

@ObjectType()
@Entity()
export class User {
  async init(newUserData: AddUserInput) {
    this.userName = newUserData.userName;
    this.password = await argon2.hash(newUserData.password);
    this.firstName = newUserData.firstName || '';
    this.lastName = newUserData.lastName || '';
    this.age = newUserData.age || 0;
    this.bio = newUserData.bio || 'Default biography here~';
    this.dateRegistered = new Date();
  }

  @Field((type) => ObjectIDResolver)
  @ObjectIdColumn()
  readonly _id: ObjectId;

  @Field()
  @Column()
  userName: string;

  @Column()
  password: string;

  @Field()
  @Column()
  firstName?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastName?: string;

  @Field()
  fullName(): string {
    return this.firstName + ' ' + this.lastName;
  }

  @Field({ nullable: true })
  @Column({ nullable: true })
  age: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  bio?: string;

  @Field()
  @Column()
  dateRegistered: Date;

  @Field((type) => [Post])
  posts: Post[];
}

@Resolver(User)
export class UserResolver implements ResolverInterface<User> {
  @Query((returns) => User, { nullable: true })
  async user(@Arg('userId') id: string, @Ctx() ctx: Context) {
    return ctx.userRepository.findOne({ where: { _id: new ObjectId(id) } });
  }

  // async user(@Args() { id }: GetUserArgs, @Ctx() ctx: Context) {
  //   return ctx.userRepository.findOne({ where: { id: new ObjectId(id) } });
  // }

  @Query((returns) => [User], { nullable: true })
  async users(@Ctx() ctx: Context) {
    return ctx.userRepository.find();
  }

  @Query((returns) => [User], { nullable: true })
  async usersByFirstName(@Arg('firstName') firstName: string, @Ctx() ctx: Context) {
    return ctx.userRepository.find({ where: { firstName: new RegExp(firstName, 'gi') } });
  }

  // async usersByFirstName(@Args() { firstName }: GetUserArgs, @Ctx() ctx: Context) {
  //   return ctx.userRepository.find({ where: { firstName: new RegExp(firstName, 'g') } });
  // }

  @Query((returns) => [User], { nullable: true })
  async usersByLastName(@Arg('lastName') lastName: string, @Ctx() ctx: Context) {
    return ctx.userRepository.find({ where: { lastName: new RegExp(lastName, 'gi') } });
  }

  // async usersByLastName(@Args() { lastName }: GetUserArgs, @Ctx() ctx: Context) {
  //   return ctx.userRepository.find({ where: { lastName: new RegExp(lastName, 'g') } });
  // }

  @FieldResolver()
  async posts(@Root() user: User, @Ctx() ctx: Context) {
    const posts = await ctx.postRepository.find({ where: { authorId: user._id.toHexString() } });
    return posts;
  }

  @Mutation((returns) => User, { description: 'Adds new user' })
  async addUser(@Arg('data') newUserData: AddUserInput, @Ctx() ctx: Context) {
    const userExists = await ctx.userRepository.find({ where: { userName: newUserData.userName } });

    if (userExists.length > 0) {
      throw new Error(`User with username '${newUserData.userName}' already exists!`);
    }

    const user = new User();
    await user.init(newUserData);
    await ctx.userRepository.save(user);
    return user;
  }

  @Mutation((returns) => User, { description: 'Logs in with provided username/password combination' })
  async logIn(@Arg('username') username: string, @Arg('password') password: string, @Ctx() ctx: Context) {
    const userToVerify = await ctx.userRepository.findOne({ where: { userName: username } });
    if (!userToVerify) {
      throw new UserInputError('User does not exist.');
    }

    try {
      if (await argon2.verify(userToVerify.password, password)) {
        return userToVerify;
      } else {
        throw new Error('Wrong username/password combination!');
      }
    } catch (error) {
      throw new Error(error);
    }
  }
}
