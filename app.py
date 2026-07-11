from flask import Flask, render_template,request,redirect 
from flask import session
import os
app = Flask(__name__)
app.secret_key=os.urandom(24)


from flask_sqlalchemy import SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///posts.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Post(db.Model):
    comments=db.relationship('Comment',backref='post' ,cascade="all, delete")
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    content = db.Column(db.String(200))
    likes = db.Column(db.Integer, default=0)

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(200))
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'))

class User(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    username=db.Column(db.String(100),unique=True,nullable=False)
    password=db.Column(db.String(200),nullable=False)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/signup",methods = ["GET","POST"])
def signup():
    if request.method=="POST":
       username=request.form.get("username")
       password=request.form.get("password")

       new_user=User(username=username,password=password)
      
       db.session.add(new_user)
       db.session.commit()

       session["user"]=username

       return redirect("/login")

    return render_template("signup.html")

@app.route("/login",methods=["GET","POST"])
def login():
    if request.method=="POST":
        username=request.form.get("username")
        password=request.form.get("password")

        found_user=User.query.filter_by(username=username).first()

        if found_user and found_user.password==password:      
           session["user"]=username
           return redirect("/home")

        else:
            return"invalid credentials"

    return render_template("login.html")

    

@app.route("/home",methods = ["GET","POST"])
def home():
    if "user" not in session:
       return redirect("/login")
    
    if request.method == "POST":
           name = request.form.get("name","").upper()
           post = request.form.get("post","").upper()
           
           if name != "" and post != "":
              new_post = Post(name=name, content=post)
              db.session.add(new_post)
              db.session.commit()

    posts = Post.query.all()           
    return render_template("home.html",posts = posts)


@app.route("/like/<int:id>")
def likes(id):
    post=Post.query.get_or_404(id)
    post.likes+=1
    db.session.commit()
    return redirect("/home")


@app.route("/comment/<int:id>", methods=["POST"])
def comments(id):
    text = request.form.get("comment")
    
    if text and text.strip() != "":
        post = Post.query.get_or_404(id)
        new_comment = Comment(text=text, post_id=post.id)
        db.session.add(new_comment)
        db.session.commit()

    return redirect("/home")

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect("/login")



@app.route("/delete/<int:id>")
def delete(id):
    post=Post.query.get_or_404(id)
    db.session.delete(post)
    db.session.commit()
    return redirect("/home")


with app.app_context():
    db.create_all()

if __name__ == "__main__":
   app.run(debug=True)  