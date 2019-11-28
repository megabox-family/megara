pipeline {
    agent any
    environment {
        DISCORD_BOT_TOKEN  = credentials('BOT_TOKEN')
    }
    tools {nodejs "12.13.0"}
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
                sh label: '', script: 'npm install'
                echo 'Printing env var:'
                print(env.DISCORD_BOT_TOKEN)
                sh label: '', script: 'export DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}'
                archiveArtifacts '**/*'
            }
        }
    }
}