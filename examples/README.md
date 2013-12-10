

Simple
------


Garage
------

Start engine proxy:

    % node garage.js
    
Then in a different shell, query the current state:

    % omf_send_request -r amqp://localhost/frcp.garage
    
which should result in something like:

    garage via frcp.garage
      name: Max's Garage
      engines: []
      @context: http://schema.mytestbed.net/tut01/garage
    -----------------
    
Now, let's create a new engine:

    % omf_send_create -r amqp://localhost/frcp.garage -t engine uid:eng1
    frcp.garage   <inform(CREATION.OK)>    
      res_id: amqp://localhost/frcp.eng1
      uid: eng1
      type: engine
    ------
    
Which we can now query for it's current state:

    % omf_send_request -r amqp://localhost/frcp.eng1
    eng1 via frcp.eng1
      max_power: 676
      provider: Honda
      max_rpm: 12500
      rpm: 1000
      @context: http://schema.mytestbed.net/tut01/engine
    -----------------
    
To find out more about the schema implemented by a resource, let's query the '@context' property:

    omf_send_request -r amqp://localhost/frcp.garage @context
    garage via frcp.garage
      @context:
        tut: http://schema.mytestbed.net/tut01/
        @type: tut:garage
        xsd: http://www.w3.org/2001/XMLSchema#
        name:
          @id: name
        engines:
          @type: tut:engine
          @container: @set
        @vocab: tut:garage#
    -----------------
  
which, beside some namespace defintions, shows us that this resource provides two properties, 'name' and 'engines'.
The property 'name' has no '@type' definition and therefore defaults to 'string'. The 'engines' property instead, holds a
set (@container: @set) of resources of type 'tut:engine', which given the additional namespace definitions resolves to
'http://schema.mytestbed.net/tut01/engine'.

Now, that we have created an engine, let's check out in what the above definition of 'engines' translates to:

    % omf_send_request -r amqp://localhost/frcp.garage 
    garage via frcp.garage
      name: Max's Garage
      engines: [{:@id=>"amqp://localhost/frcp.eng1", :@type=>"http://schema.mytestbed.net/tut01/engine"}]
      @context: http://schema.mytestbed.net/tut01/garage





    