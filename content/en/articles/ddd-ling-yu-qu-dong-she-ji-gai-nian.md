---
title: DDD: Core Concepts of Domain-Driven Design
summary: DDD, or Domain-Driven Design, is a software design methodology that defines domain models around business boundaries and is especially useful in complex systems.
author: evan
category: learning
tags: [Learning]
createdAt: 2026-01-29 21:01:52
updatedAt: 2026-01-29 21:01:52
readingMinutes: 6
---

# DDD: Core Concepts of Domain-Driven Design

## What Is DDD?

DDD, short for Domain-Driven Design, **is a software development methodology and design philosophy**. It defines domain models through a domain-driven way of thinking.

Because DDD is commonly used in microservice scenarios, the easiest way to understand it is alongside microservice architecture.

- DDD is a design philosophy used to **define business and application boundaries**.
- Microservice architecture requires a system to be split into multiple small, independent services.

**DDD is a way to split code architecture conceptually, not microservices themselves. If you want to implement a microservice architecture, you can extract the code into independently deployable units.**

### 1. Goals of DDD

1. Use domain models to implement business requirements: developers and domain experts share an understanding of the business, form a common language, and build models around it.
2. Improve system flexibility and maintainability: by dividing bounded contexts properly, you reduce coupling so that different modules or subsystems can evolve independently.
3. Support the expression of complex business logic: deep business modeling makes it possible to reflect complex logic clearly and accurately in code.

**In short, DDD helps the system fit the business better and makes large systems easier to build and maintain independently.**

### 2. Suitable Scenarios for DDD

- Systems with complex business logic, such as finance or e-commerce platforms
- Projects that require collaboration across multiple departments or teams
- Long-lived projects that need ongoing maintenance and evolution

**Summary: large, complex systems that involve cross-team collaboration and long-term maintenance.**

## Building with DDD

### 1. Strategic Design

Start from the business side, build domain models, and unify bounded contexts.

At this stage, you usually begin with brainstorming and invite people to discuss the domain together.
Describe scenarios, think broadly, discuss processes, and shape the business design.
Then sort out the relationships between domain objects and group them from different perspectives to form aggregates, aggregate roots, bounded contexts, and so on. This is the process of **convergence**.

**A bounded context can be understood as the boundary of a microservice. Once you map it into the code model, the microservice split is essentially complete.**

### 2. Tactical Design

Start from the technical implementation side and map domain models to code models.
This is the stage where the design lands in code, including the design and implementation of aggregates, aggregate roots, entities, value objects, and related logic.

## DDD Terminology

### 1. Domain

**A domain is used to define scope**, and scope means boundaries.

One domain can be divided into multiple subdomains, and each subdomain represents one part of the business.

Subdomains can be classified by importance and function:

- **Generic domain**: common capabilities that are not specific to a single business area and are reused across multiple systems, such as logging or payment
- **Supporting domain**: parts that support the system but do not directly drive business value, such as a gateway
- **Core domain**: the most critical part of the system, where the business's core competitiveness and greatest value live

### 2. Bounded Context

A bounded context is the business model and language for a specific subdomain. **It ensures that terms, rules, and models within that context do not conflict with those in other contexts.**

For example:

- "I ate a huge meal and now I'm stuffed." Here, "stuffed" is literal and means physically full.
- "Today's talk was really fulfilling." Here, the idea is metaphorical and means mentally satisfied.

A bounded context is basically like a semantic environment. A ubiquitous language needs business boundaries, and bounded contexts define those boundaries, which are also the boundaries of the domain.

### 3. Entity

In general, any object with a unique identity is an entity. In code, that identity is usually an ID. Orders have order IDs, users have user IDs, and both are classic examples of entities.

The key point of an entity is its unique identity. Its attributes may change over time, but its ID does not.

When mapped to code, an entity becomes an entity class. It is usually implemented with a **rich domain model**: **all business logic strongly related to that entity is written inside the entity class itself**. If a business behavior spans multiple entities, that logic is usually placed in a domain service.

### 4. Value Object

A value object does not have a unique identity. Once created, it should not be modified. Instead, it is replaced as a whole by another value object. It is usually used to describe an object's properties, state, or characteristics.

A classic example is an **address**. If a user changes the address, that property is replaced as a whole with a new address value object.

### 5. Aggregate

Entities and value objects are the basic domain objects. An aggregate groups multiple entities and value objects into one whole to achieve high cohesion and low coupling.

Put simply, entities and value objects are individuals. Aggregates organize those individuals to work together, which helps maintain data consistency inside the aggregate. It can also serve as the smallest unit for splitting microservices.

An aggregate is also the basic unit of data modification and persistence.

### 6. Aggregate Root

An aggregate root is like the leader inside an aggregate. The internal entities of the aggregate do not expose their interfaces directly to the outside world. Instead, the aggregate root exposes the external interface in a unified way.

**There is only one aggregate root inside an aggregate.** It organizes the internal entities and value objects through object references, while cooperation between aggregate roots is usually done through IDs.

Tip: the aggregate root is also an entity, so it has business properties, business logic, and a unique identity.

For example, if the order domain contains only two entity classes, `Order` and `OrderItem`, then the order itself is the aggregate root of that domain.

### 7. Domain Service

An aggregate root can implement complex business behaviors that span multiple entities, but to preserve high cohesion and low coupling, the aggregate root should stay focused on behaviors that are strongly tied to itself. More complex operations across multiple entities are better placed in a domain service.

For example, in an order system, handling payment may involve the order, the user's account, and payment information. That operation does not fit neatly inside any single entity, so it is a good candidate for a domain service.

A domain service is business logic that **does not belong to a single entity or value object, but is still part of the domain model**.
